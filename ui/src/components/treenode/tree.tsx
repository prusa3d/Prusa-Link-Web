// This file is part of Prusa-Connect-Local
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, Component, Fragment } from "preact";
import { useTranslation } from "react-i18next";

import "./style.scss";
import { network, apiKey } from "../utils/network";
import Title from "../../components/title";
import FolderUp from "./folderUp";
import ProjectNode from "./projectNode";
import FolderNode from "./folderNode";
import ProjectView from "../project-view";
import Toast from "../toast";
import Loading from "../loading";

interface nodeInfo {
  path: string;
  display: string;
  isFolder: boolean;
}

interface nodeFolder extends nodeInfo {
  children: nodeTree;
}

interface FileProperties {
  printing_time: number;
  material: string;
  layer_height: number;
}

interface nodeFile extends nodeInfo, FileProperties {}

interface nodeTree {
  [path: string]: nodeFolder | nodeFile;
}

interface P extends network, apiKey {}

interface S {
  parent_path: string;
  current_path: string;
  current_view: Array<nodeFolder | nodeFile> | nodeFile;
  eTag: string;
  container: nodeTree;
}

const sortByType = (a: nodeInfo, b: nodeInfo) => {
  if (a.isFolder == b.isFolder) {
    return a.display.localeCompare(b.display);
  } else if (a.isFolder) {
    return -1;
  }
  return 1;
};

let state = {
  parent_path: null,
  current_path: null,
  current_view: null,
  container: null,
  eTag: null
};

const not_found_images = [];

class Tree extends Component<P, S> {
  timer: any;
  first_time: boolean;
  constructor() {
    super();
    this.state = state;
    this.first_time = true;
  }

  onUpFolder = (update: boolean = false) => {
    if (update) {
      this.connect();
    }
    let path = this.state.parent_path;
    let newView = this.createView(path, this.state.container);
    this.setState((prevState, props) => ({
      ...prevState,
      ...newView,
      current_path: path
    }));
  };

  onSelectFolder = (path: string) => {
    const folder: nodeFolder = (this.state.current_view as Array<
      nodeFolder | nodeFile
    >).find(e => e.path === path) as nodeFolder;
    let children = folder.children;
    if (children && Object.keys(children).length > 0) {
      const newView = this.createView(null, children);
      this.setState((prevState, props) => ({
        ...prevState,
        current_view: newView.current_view,
        parent_path: this.state.current_path,
        current_path: folder.path
      }));
    } else {
      this.setState((prevState, props) => ({
        ...prevState,
        current_view: [],
        parent_path: this.state.current_path,
        current_path: folder.path
      }));
    }
  };

  onSelectFile = (path: string) => {
    const file: nodeFile = (this.state.current_view as Array<
      nodeFolder | nodeFile
    >).find(e => e.path === path) as nodeFile;

    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: '{"command":"select"}'
    };

    this.props.onFetch({
      url: this.createLink(path),
      then: e => {
        this.setState((prevState, props) => ({
          ...prevState,
          current_view: file,
          parent_path: this.state.current_path,
          current_path: path
        }));
      },
      options,
      except: e => {
        const { t, i18n, ready } = useTranslation(null, { useSuspense: false });
        new Promise<string>(function(resolve, reject) {
          if (ready) {
            if (e.message == "Not Calibrated") {
              resolve(t("ntf.n-calibrated"));
            } else if (e.message == "Conflict") {
              resolve(t("ntf.not-idle"));
            }
          }
        }).then(message => Toast.error(t("ntf.error"), message));
      }
    });
  };

  createView = (path: string, container: nodeTree) => {
    let parent_path: string = null;
    let current_view: nodeTree = container;
    let views = [];
    if (path) {
      const path_steps = path.split("/");
      parent_path = path.substring(0, path.lastIndexOf("/"));
      try {
        for (let step of path_steps) {
          let view = current_view[step] as nodeInfo;
          if (view.isFolder) {
            current_view = (view as nodeFolder).children;
          } else {
            return {
              parent_path: parent_path,
              current_view: view as nodeFile
            };
          }
        }
      } catch (error) {}
    }
    for (let path_key in current_view) {
      views.push(current_view[path_key]);
    }

    return {
      parent_path: parent_path,
      current_view: views.sort(sortByType)
    };
  };

  createContainer = (files, parent: string = null) => {
    let result = {};

    for (let i = 0; i < files.length; i++) {
      let file_or_folder = files[i];
      let isFolder = file_or_folder["type"] == "folder";
      let origin: string =
        file_or_folder["origin"] === "local" ? "local" : "usb";

      let obj: nodeInfo = {
        path: `${origin}/${file_or_folder["path"]}`,
        display: file_or_folder["display"],
        isFolder: isFolder
      };
      if (isFolder) {
        let children = file_or_folder["children"];
        if (children) {
          obj["children"] = this.createContainer(
            children,
            file_or_folder["path"]
          );
        }
      } else {
        let gcodeAnalysis = file_or_folder["gcodeAnalysis"];
        if (gcodeAnalysis) {
          if (gcodeAnalysis["estimatedPrintTime"]) {
            obj["printing_time"] = gcodeAnalysis["estimatedPrintTime"];
          }
          let material = gcodeAnalysis["material"];
          obj["material"] = material
            .substring(0, material.indexOf("@") || material.length)
            .trim();
          obj["layer_height"] = gcodeAnalysis["dimensions"]["height"];
        }
      }
      if (parent) {
        result[file_or_folder["path"].substring(parent.length + 1)] = obj;
      } else {
        let originDic: nodeFolder = result[origin];
        if (!originDic) {
          originDic = {
            path: origin,
            display: origin,
            isFolder: true,
            children: {}
          };
          result[origin] = originDic;
        }
        let children = originDic.children;
        children[file_or_folder["path"]] = obj as nodeFolder | nodeFile;
      }
    }
    return result;
  };

  connect = async () => {
    return this.props.onFetch({
      url: "/api/files?recursive=true",
      then: response => {
        const eTag = response.headers.get("etag");
        response.json().then(data => {
          if (data && "files" in data) {
            const newContainer = this.createContainer(data["files"]);
            const newView = this.createView(
              this.state.current_path,
              newContainer
            );
            this.setState((prevState, props) => ({
              ...prevState,
              eTag: eTag,
              container: newContainer,
              ...newView
            }));
          }
        });
      },
      options: {
        headers: {
          "If-None-Match": this.state.eTag
        }
      }
    });
  };

  componentDidMount() {
    this.connect().finally(() => {
      this.first_time = false;
    });
    this.timer = setInterval(this.connect, Number(process.env.UPDATE_FILES));
  }

  componentWillUnmount() {
    state = this.state;
    clearInterval(this.timer);
  }

  componentDidCatch(error: any) {
    this.setState({
      parent_path: null,
      current_path: null,
      current_view: [],
      container: null,
      eTag: null
    });
  }

  createLink = (path: string) => {
    if (path[0] === "u") {
      return "/api/files/sdcard" + path.substring(3);
    }
    return "/api/files/" + path;
  };

  createPreview = (path: string) => {
    if (path[0] === "u") {
      return "/api/files/preview/sdcard" + path.substring(3) + ".png";
    }
    return "/api/files/preview/" + path + ".png";
  };

  createUploadLink = (path: string) => {
    if (path[0] === "u") {
      return {
        url: "/api/files/sdcard",
        path: path.substring(3),
        update: this.connect,
        getApikey: this.props.getApikey
      };
    }
    return {
      url: "/api/files/local",
      path: path.substring(5),
      update: this.connect,
      getApikey: this.props.getApikey
    };
  };

  render({ onFetch }, { current_view, current_path, ...others }) {
    const showTree = Array.isArray(current_view);
    let listNodes = [];
    let title;
    const { t, i18n, ready } = useTranslation(null, { useSuspense: false });
    if (showTree) {
      title = current_path
        ? current_path.split("/").join(" > ")
        : ready
        ? t("proj.title")
        : "";
      listNodes = current_view.map((node: nodeInfo) => {
        if (node.isFolder) {
          return (
            <FolderNode
              display={node.display}
              onSelectFolder={() => this.onSelectFolder(node.path)}
            />
          );
        } else {
          return (
            <ProjectNode
              {...(node as nodeFile)}
              onSelectFile={() => this.onSelectFile(node.path)}
              preview_src={this.createPreview(node.path)}
              not_found={not_found_images}
              onFetch={onFetch}
            />
          );
        }
      });
    } else {
      title = current_path
        ? current_path
            .split("/")
            .slice(0, -1)
            .join(" > ")
        : "";
    }

    return (
      <Fragment>
        {current_view ? (
          showTree ? (
            <Fragment>
              {ready && <Title title={title} onFetch={onFetch} />}
              <div class="columns is-multiline is-mobile tree-marginless">
                {current_path && (
                  <FolderUp
                    upload_info={this.createUploadLink(current_path)}
                    onUpFolder={this.onUpFolder}
                  />
                )}
                {listNodes}
              </div>
            </Fragment>
          ) : (
            <ProjectView
              onBack={this.onUpFolder}
              {...current_view}
              preview_src={this.createPreview((current_view as nodeFile).path)}
              not_found={not_found_images}
              title={title}
              onFetch={onFetch}
              url={this.createLink((current_view as nodeFile).path)}
            />
          )
        ) : this.first_time ? (
          <Loading />
        ) : null}
      </Fragment>
    );
  }
}

export default Tree;
