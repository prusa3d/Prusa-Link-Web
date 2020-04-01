// This file is part of Prusa-Connect-Local
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, Component, Fragment } from "preact";
import { useTranslation } from "react-i18next";

import "./style.scss";
import Title from "../../components/title";
import FolderUp from "./folderUp";
import ProjectNode from "./projectNode";
import FolderNode from "./folderNode";
import ProjectView from "../project-view";

interface nodeInfo {
  path: string;
  display: string;
  isFolder: boolean;
}

interface nodeFolder extends nodeInfo {
  children: nodeTree;
}

interface FileProperties {
  printing_time: string;
  material: string;
  layer_height: number;
}

interface nodeFile extends nodeInfo, FileProperties {}

interface nodeTree {
  [path: string]: nodeFolder | nodeFile;
}

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

class Tree extends Component<{}, S> {
  timer: any;
  constructor() {
    super();
    this.state = state;
  }

  onUpFolder = () => {
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
    if (Object.keys(children).length > 0) {
      const newView = this.createView(null, children);
      this.setState((prevState, props) => ({
        ...prevState,
        current_view: newView.current_view,
        parent_path: this.state.current_path,
        current_path: folder.path
      }));
    }
  };

  onSelectFile = (path: string) => {
    const file: nodeFile = (this.state.current_view as Array<
      nodeFolder | nodeFile
    >).find(e => e.path === path) as nodeFile;

    const url = this.createLink(path);
    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Api-Key": process.env.APIKEY
      },
      body: JSON.stringify({
        command: "select"
      })
    })
      .then(response => {
        if (!response.ok) {
          throw Error(response.statusText);
        }
        return response;
      })
      .catch(e => {
        fetch("/api/job", {
          method: "POST",
          headers: {
            "X-Api-Key": process.env.APIKEY,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            command: "cancel"
          })
        }).then(() => {
          fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Api-Key": process.env.APIKEY
            },
            body: JSON.stringify({
              command: "select"
            })
          });
        });
      })
      .finally(() => {
        this.setState((prevState, props) => ({
          ...prevState,
          current_view: file,
          parent_path: this.state.current_path,
          current_path: path
        }));
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
            let hours = gcodeAnalysis["estimatedPrintTime"] / 3600;
            let h = Math.trunc(hours);
            let m = Math.round((hours - h) * 60);
            obj["printing_time"] =
              (h > 0 ? `${h}h ` : "") + `${("0" + m).substr(-2)}m`;
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
    let response = await fetch("/api/files?recursive=true", {
      method: "GET",
      headers: {
        "X-Api-Key": process.env.APIKEY,
        "If-None-Match": this.state.eTag,
        Accept: "application/json"
      }
    });

    if (response.ok) {
      const eTag = response.headers.get("etag");
      const data = await response.json();
      if (data && "files" in data) {
        const newContainer = this.createContainer(data["files"]);
        const newView = this.createView(this.state.current_path, newContainer);
        this.setState((prevState, props) => ({
          ...prevState,
          eTag: eTag,
          container: newContainer,
          ...newView
        }));
      }
    }
  };

  componentDidMount() {
    this.connect();
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
        update: this.connect
      };
    }
    return {
      url: "/api/files/local",
      path: path.substring(5),
      update: this.connect
    };
  };

  render({}, { current_view, current_path, ...others }) {
    const showTree = Array.isArray(current_view);
    let listNodes = [];
    if (showTree) {
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
            />
          );
        }
      });
    }

    const { t, i18n, ready } = useTranslation(null, { useSuspense: false });
    return (
      <Fragment>
        {current_view ? (
          showTree ? (
            <Fragment>
              {ready && <Title title={t("proj.title")} />}
              <div class="columns is-multiline is-mobile">
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
            />
          )
        ) : null}
      </Fragment>
    );
  }
}

export default Tree;
