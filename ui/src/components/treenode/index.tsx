// This file is part of Prusa-Connect-Web
// Copyright (C) 2018-2019 Prusa Research s.r.o. - www.prusa3d.com
// SPDX-License-Identifier: GPL-3.0-or-later

import { h, Component, Fragment } from "preact";
import "./style.scss";
import { FileProperties } from "./projectProperties";
import FolderUp from "./folderUp";
import ProjectNode from "./projectNode";
import FolderNode from "./folderNode";
import ProjectView from "./projectView";

interface nodeInfo {
    path: string;
    display: string;
    isFolder: boolean;
}

interface nodeFolder extends nodeInfo {
    children: nodeTree;
}

interface nodeFile extends nodeInfo, FileProperties {
}

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
    return 1
};

let state = {
    parent_path: null,
    current_path: null,
    current_view: null,
    container: null,
    eTag: null
};

class TreeNode extends Component<{}, S> {

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
    }

    onSelectFolder = (path: string) => {
        const folder: nodeFolder = (this.state.current_view as Array<nodeFolder | nodeFile>)
            .find(e => e.path === path) as nodeFolder;
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
    }

    onSelectFile = (path: string) => {
        const file: nodeFile = (this.state.current_view as Array<nodeFolder | nodeFile>)
            .find(e => e.path === path) as nodeFile;
        this.setState((prevState, props) => ({
            ...prevState,
            current_view: file,
            parent_path: this.state.current_path,
            current_path: path
        }));
    }

    createView = (path: string, container: nodeTree) => {

        let parent_path: string = null;
        let current_view: nodeTree = container;
        let views = [];
        if (path) {
            const path_steps = path.split('/');
            parent_path = path.substring(0, path.lastIndexOf('/'));
            for (let step of path_steps) {
                let view = current_view[step] as nodeInfo;
                if (view.isFolder) {
                    current_view = (view as nodeFolder).children;
                } else {
                    return {
                        parent_path: parent_path,
                        current_view: view as nodeFile
                    }
                }
            }
        }
        for (let path_key in current_view) {
            views.push(current_view[path_key]);
        }

        return {
            parent_path: parent_path,
            current_view: views.sort(sortByType)
        }
    }

    createContainer = (files, parent: string = null) => {
        let result = {};

        for (let i = 0; i < files.length; i++) {
            let file_or_folder = files[i];
            let isFolder = file_or_folder["type"] == "folder";
            let origin: string = file_or_folder["origin"] === "local" ? "local" : "usb";

            let obj: nodeInfo = {
                path: `${origin}/${file_or_folder["path"]}`,
                display: file_or_folder["display"],
                isFolder: isFolder
            }
            if (isFolder) {
                let children = file_or_folder["children"];
                if (children) {
                    obj["children"] = this.createContainer(children, file_or_folder["path"]);
                }
            } else {
                let gcodeAnalysis = file_or_folder["gcodeAnalysis"];
                if (gcodeAnalysis) {
                    let hours = gcodeAnalysis["estimatedPrintTime"] / 3600;
                    let h = Math.trunc(hours);
                    let m = Math.round((hours - h) * 60);
                    obj["printing_time"] = (h > 0 ? `${h}h ` : "") + `${m > 9 ? m : `0${m}`}m`;
                    let material = gcodeAnalysis["material"];
                    obj["material"] = material.substring(0, material.indexOf('@') || material.length).trim()
                    obj["leyer_height"] = gcodeAnalysis["dimensions"]["height"];
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
                    }
                    result[origin] = originDic;
                }
                let children = originDic.children;
                children[file_or_folder["path"]] = obj as nodeFolder | nodeFile;
            }
        }
        return result;
    };

    connect = async () => {

        let response = await fetch('/api/files?recursive=true', {
            method: 'GET',
            headers: {
                "X-Api-Key": process.env.APIKEY,
                "If-None-Match": this.state.eTag
            },
        });

        if (response.ok) {
            const eTag = response.headers.get('etag');
            const data = await response.json();
            if (data && "files" in data) {
                const newContainer = this.createContainer(data["files"]);
                const newView = this.createView(this.state.current_path, newContainer);
                this.setState((prevState, props) => (
                    {
                        ...prevState,
                        eTag: eTag,
                        container: newContainer,
                        ...newView
                    }
                ));
            }

        }
    }

    componentDidMount() {
        this.connect();
        this.timer = setInterval(this.connect, Number(process.env.UPDATE_TIMER));
    }

    componentWillUnmount() {
        state = this.state;
        clearInterval(this.timer);
    }

    componentDidCatch(error) {
        this.setState({
            parent_path: null,
            current_path: null,
            current_view: [],
            container: null,
            eTag: null
        });
    }

    render({ }, { current_view, current_path, ...others }) {

        const showTree = Array.isArray(current_view);
        let listNodes = [];
        if (showTree) {
            listNodes = current_view.map(node => {
                if (node.isFolder) {
                    return <FolderNode
                        display={node.display}
                        onSelectFolder={() => this.onSelectFolder(node.path)} />
                } else {
                    return <ProjectNode
                        {...(node as nodeFile)}
                        onSelectFile={() => this.onSelectFile(node.path)}
                    />
                }
            });
        }

        return (
            <Fragment>
                {
                    current_view ?
                        showTree ?
                            <div class="columns is-multiline is-mobile">
                                {current_path && <FolderUp onUpFolder={this.onUpFolder} />}
                                {listNodes}
                            </div>
                            :
                            <ProjectView
                                onBack={this.onUpFolder}
                                {...current_view}
                                path={"path"}
                            />
                        : null
                }
            </Fragment>
        );
    }
}



export default TreeNode;
