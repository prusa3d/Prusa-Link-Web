import { getImage, getJson } from "../../auth";
import { handleError } from "../components/errors";
import { LinkState } from "../../state";
import { getEstimatedEnd } from "../common";

export class Context {
  constructor() {
    this.state = undefined;
    this.printer = undefined;
    this.job = undefined;
    this.transfer = undefined;
    this.version = undefined;
    this.storage = [];
    this.currentStorage = undefined;
    this.telemetry = {
      temperature: {
        nozzle: {
          current: 0.0,
          target: 0.0,
        },
        bed: {
          current: 0.0,
          target: 0.0,
        },
      },
    };
    this.flow = 0;
    this.speed = 0;
    this.fan = {
      hotend: 0,
      print: 0,
    };
    this.link = {
      connect: {
        ok: true,
        message: "OK",
        settings: {
          hostname: 'connect.prusa3d.com',
          tls: true,
          port: 0
        }
      },
      printer: {
        ok: true,
        message: "OK",
        settings: {
          port: '',
          baudrate: 115200,
        }
      },
    };
    this.files = {
      location: "/",
      selected: {
        file: undefined,
        thumbnail: undefined,
      },
    };
    this.fileExtensions = process.env["FILE_EXTENSIONS"];
    this.updateConnection();
  }

  updateConnection() {
    return getJson("/api/connection", { method: "GET" })
      .then(res => {
        this.link.connect.settings = {
          hostname: res.data.connect.hostname,
          port: res.data.connect.port,
          tls: res.data.connect.tls,
        };
        this.link.connect.registration = res.data.connect.registration;
        this.link.printer.settings = {
          port: res.data.current.port,
          baudrate: res.data.current.baudrate,
        };
      });
  }

  update({ status, printer }) {
    if (status?.ok && status.payload) {
      this.updateStatus(status.payload.data);
    }

    if (printer) {
      this.updatePrinter(printer);
    }
  }

  updateStatus(status) {
    this.updateTelemetry(status?.printer);
    //this.updateJob(status.job);
    //this.updateStorage(status.storage);
    //this.updateTransfer(status.transfer);
    this.updateCamera(status.camera);
  }

  updatePrinter(printer) {
    this.printer = {
      name: printer.name,
      location: printer.location,
      farmMode: printer.farm_mode,
      nozzleDiameter: printer.nozzle_diameter,
      minExtrusionTemp: printer.min_extrusion_temp,
      serial: printer.serial,
      hostname: printer.hostname,
      port: printer.port,
    };
  }

  updateTelemetry(printer) {
    this.state = LinkState.fromApi(printer?.state.toUpperCase() || "IDLE");

    this.telemetry = {
      cameras: printer?.cameras ?? 0,
    }
    /* 
    this.telemetry = {
      temperature: {
        nozzle: {
          current: printer.temp_nozzle,
          target: printer.target_nozzle,
        },
        bed: {
          current: printer.temp_bed,
          target: printer.target_bed,
        },
      },
      axis: {
        x: printer.axis_x,
        y: printer.axis_y,
        z: printer.axis_z,
      },
      flow: printer.flow,
      speed: printer.speed,
      fan: {
        hotend: printer.fan_hotend,
        print: printer.fan_print,
      },
    };
    */
    // hide status if connect is not supported
    this.link.connect.message = printer?.status_connect?.message ?? "";
    this.link.connect.ok = printer?.status_connect?.ok || true;
    // just suppress the status if unsupported by the printer
    this.link.printer.message = printer?.status_printer?.message ?? 'ok';
    this.link.printer.ok = printer?.status_printer?.ok ?? true;
  }

  updateJob(job) {
    const oldJobId = this.job?.id || null;
    const newJobId = job?.id || null;

    if (oldJobId !== newJobId) {
      if (!newJobId) {
        this.job = undefined;
        return;
      }
      getJson("/api/v1/job")
        .then((response) => {
          const data = response.data;
          if (data.id !== this.job.id) {
            return;
          }

          this.job = {
            ...this.job,
            file: mapFile(data.file),
            thumbnail: {
              source: !data.file.refs?.thumbnail,
              ready: !data.file.refs?.thumbnail,
              url: undefined,
            },
          };

          if (!this.job.thumbnail.ready) {
            getImage(this.job.file.refs.thumbnail)
              .then(({ url }) => {
                if (this.job.id === newJobId) {
                  this.job.thumbnail.url = url;
                }
              })
              .catch((e) => console.error("Failed to fetch thumbnail", e))
              .finally(() => (this.job.thumbnail.ready = true));
          }
        })
        .catch((err) => handleError(err));
    }
    if (newJobId) {
      const lastTimeRemaining = this.job?.timeRemaining;
      const thisTimeRemaning = job.time_remaining;
      const estimatedEnd =
        lastTimeRemaining != thisTimeRemaning
          ? getEstimatedEnd(thisTimeRemaning)
          : this.job?.estimatedEnd;

      this.job = {
        file: undefined,
        ...this.job,
        timePrinting: job.time_printing,
        id: newJobId,
        progress: job.progress,
        timeRemaining: job.time_remaining,
        estimatedEnd,
      };
    }
  }

  updateStorage(storage) {
    Object.keys(storage).forEach((entry) => {
      const data = {
        path: entry.path,
        name: entry.name,
        readOnly: entry.readOnly,
        freeSpace: entry.freeSpace,
      };
      const index = this.storage.findIndex(
        (location) => location.path === data.path
      );
      if (index !== -1) {
        this.storage[index] = data;
      } else {
        this.storage.push(data);
      }
    });
  }

  updateTransfer(transfer) {
    const oldId = this.transfer?.id || null;
    const newId = transfer?.id || null;

    if (oldId !== newId) {
      if (!newId) {
        this.transfer = undefined;
        return;
      }
      getJson("/api/v1/transfer")
        .then((response) => {
          const data = response.data;
          // NOTE: there must be this check
          // if (data.id !== this.transfer.id) {
          //   return;
          // }
          this.transfer = {
            ...this.transfer,
            file: {
              displayName: data.display_name ?? data.name,
              path: data.path,
              size: data.size,
              toPrint: data.to_print,
            },
          };
        })
        .catch((err) => handleError(err));
    }
    if (newId) {
      const now = Math.round(Date.now() / 1000);
      const fileSize = this.transfer?.file?.size || 0;
      const timeTransferring = transfer.time_transferring;
      const timeStarted = timeTransferring !== undefined 
        ? now - timeTransferring
        : undefined;
      const dataTransferred = transfer.data_transferred;
      const dataRemaining = fileSize - dataTransferred;
      const timeRemaining = (timeTransferring > 0 && dataRemaining >= 0)
        ? (dataRemaining / (dataTransferred / timeTransferring))
        : undefined;

      this.transfer = {
        ...this.transfer,
        timeTransferring,
        timeStarted,
        timeRemaining,
        id: newId,
        progress: transfer.progress,
        dataTransferred
      };
    }
  }

  updateCamera(camera) {
    this.camera = {
      id: camera?.id,
    };
  }

  selectFile(file) {
    if (!file) {
      this.files.selected = null;
      return;
    }
    
    const thumbnailSource = file.refs?.thumbnail;

    this.files.selected = {
      file: mapFile(file),
      thumbnail: {
        source: thumbnailSource,
        ready: !thumbnailSource,
        url: undefined,
      },
      timeRemaining: file.meta?.estimated_print_time,
    };

    if (!file.meta) {
      const resource = this.files.selected.file.resource;
      getJson(resource)
        .then(response => {
          const fullFileInfo = mapFile({...response.data, resource});
          if (this.files.selected.file.resource === resource) {
            this.files.selected.file.meta = fullFileInfo.meta;
            this.files.selected.timeRemaining = fullFileInfo.meta?.estimatedPrintTime;
          }
        });
    }
    
    if (thumbnailSource) {
      getImage(thumbnailSource)
        .then(({ url }) => {
          if (thumbnailSource === this.files.selected.thumbnail.source) {
            this.files.selected.thumbnail.url = url;
          }
        })
        .catch(() => {}) // NOTE: ignore missing thumbnail
        .finally(() => {
          if (thumbnailSource === this.files.selected.thumbnail.source) {
            this.files.selected.thumbnail.ready = true;
          }
        });
    }
  }
}

const getFileResource = (path, name) =>
  `${path}${path.endsWith("/") ? "" : "/"}${name}`;

const mapFile = (data) => ({
  resource: data.resource ?? getFileResource(data.path, data.name),
  name: data.name,
  displayName: data.display_name ?? data.name,
  path: data.path,
  displayPath: data.display_path ?? data.path,
  size: data.size,
  refs: {
    download: data.refs?.download,
    icon: data.refs?.icon,
    thumbnail: data.refs?.thumbnail,
  },
  lastModified: data.m_timestamp || 0,
  meta: {
    filamentType: data.meta?.filament_type,
    layerHeight: data.meta?.layer_height,
    estimatedPrintTime: data.meta?.estimated_print_time,
  },
  readOnly: data.read_only || data.ro
});
