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
import Upload from "../upload";

export interface TreeProps extends network, apiKey {
  showPreview: boolean;
}

interface S {
  current_path: any[];
  files: any[];
  eTag: any;
  origin: string;
  preview: any;
}
let isLoading = true;

const sortByType = (a, b) => {
  if (a["type"] == "folder") {
    if (b["type"] == "folder") {
      return a.display.localeCompare(b.display);
    } else {
      return -1;
    }
  } else {
    if (b["type"] == "folder") {
      return Number.MAX_SAFE_INTEGER;
    } else {
      return b.date - a.date;
    }
  }
};

let state = {
  current_path: [],
  files: [],
  eTag: null,
  origin: "local",
  preview: null,
};

const not_found_images = [];

export class Tree extends Component<TreeProps, S> {
  timer: any;
  constructor() {
    super();
    this.state = state;
  }

  onOpenFile = (url: string) => {
    const options = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: '{"command":"select"}',
    };

    this.props.onFetch({
      url: url,
      then: () => { isLoading = false; },
      options,
      except: (e) => {
        isLoading = false;
        const { t, i18n, ready } = useTranslation(null, { useSuspense: false });
        new Promise<string>(function(resolve, reject) {
          if (ready) {
            if (e.message == "Not Calibrated") {
              resolve(t("ntf.n-calibrated"));
            } else if (e.message == "Conflict") {
              resolve(t("ntf.not-idle"));
            }
          }
        }).then((message) => Toast.error(t("ntf.error"), message));
      },
    });
  };

  updateData = () => {
    const auth = sessionStorage.getItem("auth") || "false";
    if (auth == "true") {
      this.props.onFetch({
        url: "/api/files?recursive=true",
        then: (response) => {
          const eTag = response.headers.get("etag");
          response.json().then((data) => {
            isLoading = false;
            this.setState({
              eTag: eTag,
              files: data.files,
            });
            if (this.props.showPreview && !this.state.preview) {
              this.getPreview();
            }
          });
        },
        options: {
          headers: {
            "If-None-Match": this.state.eTag,
          },
        },
        except: (e) => {
          isLoading = false;
          if (e.name === "304") {
            if (this.props.showPreview && !this.state.preview) {
              this.getPreview();
            }
          }
        },
      });
    }
  };

  componentDidMount() {
    this.updateData();
    this.timer = setInterval(
      () => this.updateData(),
      Number(process.env.UPDATE_FILES)
    );
  }

  componentWillUnmount() {
    state = this.state;
    clearInterval(this.timer);
  }

  createFolder(node) {
    return (
      <FolderNode
        display={node.display}
        onSelectFolder={() =>
          this.setState({
            ...this.state,
            current_path: [...this.state.current_path, node.name],
            origin: node.origin,
          })
        }
      />
    );
  }

  getFileProperties(node) {
    const result = {
      printing_time: undefined,
      material: undefined,
      layer_height: undefined,
    };
    const gcodeAnalysis = node["gcodeAnalysis"];
    if (gcodeAnalysis) {
      if (gcodeAnalysis["estimatedPrintTime"]) {
        result["printing_time"] = gcodeAnalysis["estimatedPrintTime"];
      }
      let material = gcodeAnalysis["material"];
      if (material) {
        result["material"] = material
          .substring(0, material.indexOf("@") || material.length)
          .trim();
      }
      result["layer_height"] = gcodeAnalysis["dimensions"]
        ? gcodeAnalysis["dimensions"]["height"]
        : undefined;
    }

    return result;
  }

  createFile(node) {
    const props = this.getFileProperties(node);

    return (
      <ProjectNode
        display={node.display}
        printing_time={props.printing_time}
        material={props.material}
        layer_height={props.layer_height}
        onSelectFile={() => {
          isLoading = true;
          this.onOpenFile(`/api/files/${node.origin}/${node.path}`);
        }}
        preview_src={`/api/files/preview/${node.origin}/${node.path}.png`}
        not_found={not_found_images}
        onFetch={this.props.onFetch}
      />
    );
  }

  createUp(listNodes) {
    const { t, i18n, ready } = useTranslation(null, { useSuspense: false });
    return [
      <FolderUp
        onUpFolder={() =>
          this.setState({
            ...this.state,
            current_path: [
              ...this.state.current_path.slice(
                0,
                this.state.current_path.length - 1
              ),
            ],
            origin:
              this.state.current_path.length == 0 ? "local" : this.state.origin,
          })
        }
      />,
    ].concat(listNodes);
  }

  createUpload() {
    return (
      <div class="column is-full">
        <Upload
          url={`/api/files/${this.state.origin}`}
          path={this.state.current_path.join("/")}
          getApikey={this.props.getApikey}
        />
      </div>
    );
  }

  showProjects() {
    const { t, i18n, ready } = useTranslation(null, { useSuspense: false });
    let view: any = this.state.files;
    if (this.state.current_path.length > 0) {
      for (let i = 0; i < this.state.current_path.length; i++) {
        let path = this.state.current_path[i];
        view = view.find((elm) => elm.name == path).children;
      }
    }
    view = view.sort(sortByType);

    let listNodes = [];
    for (let i = 0; i < view.length; i++) {
      const node = view[i];
      if (node["type"] == "folder") {
        if (node.children && node.children.length > 0) {
          listNodes.push(this.createFolder(node));
        }
      } else {
        listNodes.push(this.createFile(node));
      }
    }

    if (this.state.current_path.length > 0) {
      listNodes = this.createUp(listNodes);
    }

    return (
      <Fragment>
        {ready && (
          <Title
            title={
              this.state.current_path.length > 0
                ? this.state.current_path.join(" > ")
                : t("proj.title")
            }
            onFetch={this.props.onFetch}
          />
        )}
        {this.createUpload()}
        {listNodes && listNodes}
      </Fragment>
    );
  }

  showPreview() {
    const { t, i18n, ready } = useTranslation(null, { useSuspense: false });
    const props = this.getFileProperties(this.state.preview);
    const parentPath = this.state.preview.path
      .split("/")
      .slice(0, -1)
      .filter((e) => e != "");
    const title = parentPath.join(" > ") || t("proj.title");

    const url = `${this.state.preview.origin}/${this.state.preview.path}`;

    return (
      <ProjectView
        onBack={() => {
          isLoading = false;
          this.setState({
            ...this.state,
            preview: null,
            current_path: parentPath,
          });
          this.updateData();
        }}
        display={this.state.preview.display}
        printing_time={props.printing_time}
        layer_height={props.layer_height}
        preview_src={`/api/files/preview/${url}.png`}
        not_found={not_found_images}
        title={title}
        onFetch={this.props.onFetch}
        url={`/api/files/${url}`}
        onCancel={() => {}}
        onclick={() => {}}
        onConfirm={() => {}}
      />
    );
  }

  getPreview() {
    this.props.onFetch({
      url: "/api/files/preview",
      then: (response) => {
        response
          .json()
          .then((data) => this.setState({ ...this.state, preview: data }));
      },
    });
  }

  render() {
    if (this.props.showPreview) {
      if (!this.state.preview) {
        return <Loading />;
      }
      return this.showPreview();
    } else {
      if (isLoading) {
        return <Loading />;
      }
      return this.showProjects();
    }
  }
}

export default Tree;
