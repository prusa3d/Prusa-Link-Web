import { getImage, getJson } from "../../auth";

let lastUpdated = null;
let selectedCamera = null;

function selectCamera(cameraId, config, timestamp) {
    const cameraImage = document.getElementById("camera-snapshot-picture");
    const cameraNameLabel = document.getElementById("camera-snapshot-name");
    const cameraTimeLabel = document.getElementById("camera-snapshot-time");

    cameraImage.src = "";
    cameraTimeLabel.innerText = "";
    cameraNameLabel.innerText = config.name || "";

    selectedCamera = cameraId;

    getImage(`/api/v1/cameras/${cameraId}/snap`, timestamp).then(url => {
        cameraImage.src = url;
        cameraTimeLabel.innerText = (new Date ()).toLocaleString();
    });
}

function createCamera(cameraId, config, timestamp) {
    const node = document.createElement("li");
    const link = document.createElement("a");
    const img = document.createElement("img");
    link.appendChild(img);
    node.appendChild(link);
    
    getImage(`/api/v1/cameras/${cameraId}/snap`, timestamp).then(url => img.src = url);

    link.href="javascript:;";
    link.addEventListener("click", (e) => {
        selectCamera(cameraId, config);  
        e.preventDefault();
    });

    return node;
}

function update() {
    const now = new Date();
    if (lastUpdated) {
        const elapsed = now.getTime() - lastUpdated.getTime();
        if (elapsed < 60000) {
            return;
        }
    }
    const timestamp = Math.round(now / 1000);
    
    getJson("/api/v1/cameras").then(result => {
        const items = result?.data?.camera_list.filter(
            camera => camera.status.toUpperCase() === "CONNECTED"
        ) || [];
        const hasCameras = !!items.length;

        if (selectedCamera && !items.find(({camera_id}) => camera_id === selectedCamera)) {
            selectedCamera = null;
        }

        let cameraPreviews = document.getElementById("camera-previews");
        if (hasCameras) {
            if (!cameraPreviews) {
                const template = document.getElementById("cameras").content;
                const node = document.importNode(template, true);
                cameraPreviews = node.getElementById("camera-previews");
                document.getElementById("root").appendChild(node);
            } else {
                while (cameraPreviews.firstChild) {
                    cameraPreviews.removeChild(cameraPreviews.firstChild);
                }
            }

            items.forEach(
                ({camera_id, config}) => {
                    cameraPreviews.appendChild(
                        createCamera(camera_id, config, timestamp)
                    );
                    if (!selectedCamera || selectedCamera === camera_id) {
                        selectCamera(camera_id, config, timestamp);
                    }
                }
            );
        } else if (cameraPreviews) {
            document.getElementById("root").removeChild(cameraPreviews.parentNode);
        }
    });

    lastUpdated = now;
}

export default { 
    init: () => update(),
    update,
};