import { h, Fragment, FunctionalComponent, Component } from 'preact';
import "./style.scss";

interface StatusBoardItemProps {
  title: string,
  value: string | number
}

interface StatusBoardTableProps {
  remaining_time: string | number,
  estimated_end: string | number,
  printing_time: string | number,
  layer: string | number,
  remaining_material: string | number,
  consumed_material: string | number
}

function timeConverter(timestamp: number) {
  var msec = timestamp;
  var hh:string | number = Math.floor(msec / 1000 / 60 / 60);
  msec -= hh * 1000 * 60 * 60;
  var mm = Math.floor(msec / 1000 / 60);
  msec -= mm * 1000 * 60;
  var ss = Math.floor(msec / 1000);
  msec -= ss * 1000;
  if(hh<10){
    hh = '0'+hh;
  }
  if(mm<10){
    mm = '0'+mm;
  }
  if(ss<10){
    ss = '0'+ss;
  }
  return hh + ':' + mm + ':' + ss;
}

const StatusBoardItem: FunctionalComponent = (props: StatusBoardItemProps) => {
  return (
    <div class="column is-one-third">
      <p class="subtitle is-6 has-text-grey">
        {props.title}
      </p>
      <p class="title is-5 has-text-white">
        {props.value}
      </p>
    </div>
  );
};

const StatusBoardTable: FunctionalComponent = (props: StatusBoardTableProps) => {
  return (
    <Fragment>
      <div class="columns">
        <StatusBoardItem title="remaining time" value={props.remaining_time} />
        <StatusBoardItem title="estimated end" value={props.estimated_end} />
        <StatusBoardItem title="printing time" value={props.printing_time} />
      </div>
      <div class="columns">
        <StatusBoardItem title="layer" value={props.layer} />
        <StatusBoardItem title="remaining filament" value={props.remaining_material} />
        <StatusBoardItem title="consumed filament" value={props.consumed_material} />
      </div>
    </Fragment>
  );
};


class StatusBoard extends Component {

  constructor() {
    super();
    this.timer = null;
    this.state = {
      remaining_time: "00:00",
      estimated_end: "00:00",
      printing_time: "00:00",
      layer: "0/0",
      remaining_material: "0/0",
      consumed_material: "0/0",
      status_progress: 0
    };
  }

  componentDidMount() {

    let { apiKey, baseURL, update_timer } = this.props.config;

    this.timer = setInterval(() => {

      if (this.state.status_progress == 0) {
        fetch('/api/files/local/internal/harry_potter_hogwarts_anthony_mohimont.sl1', {
          method: 'POST',
          headers: {
            "X-Api-Key": apiKey,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ "command": "select", "print": true })
        })

      }

      const properties = [
        "progress",
        "resin_used_ml",
        "resin_remaining_ml",
        "print_start_timestamp",
        "expected_finish_timestamp",
        "current_layer",
        "total_layers"
      ].map(key => 'props=' + key).join('&');



      fetch('/api/v2/properties?' + properties, {
        method: 'GET',
        headers: {
          "X-Api-Key": apiKey,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      })
        .then(response => response.json())
        .then(data => {

          let print_start_timestamp = new Date(data.print_start_timestamp * 1000);
          let now = new Date();
          let eft = new Date(data.expected_finish_timestamp * 1000);

          let estimated_end = `${eft.getHours()}:${eft.getMinutes()}:${eft.getSeconds()}`;

          if (eft < now) {
            eft.setDate(eft.getDate() + 1);
          }
          let remaining_time = timeConverter(eft - now);

          if (now < print_start_timestamp) {
            now.setDate(now.getDate() + 1);
          }
          let printing_time = timeConverter(now - print_start_timestamp);

          this.setState({
            remaining_time: remaining_time,
            estimated_end: estimated_end,
            printing_time: printing_time,
            layer: `${data.current_layer}/${data.total_layers}`,
            remaining_material: `${data.resin_remaining_ml} ml`,
            consumed_material: `${data.resin_used_ml} ml`,
            status_progress: data.progress
          });
        });

    }, update_timer);
  }

  componentWillUnmount() {
    clearInterval(this.timer);
  }

  render() {
    return (
      <Fragment>
        <div class="box has-background-black is-paddingless">
          <p class="title is-5 prusa-text-orange prusa-line">
            PRUSA MINI <span class="subtitle is-6 has-text-grey">printer status</span>
          </p>
          <progress class="progress is-success is-medium" value={this.state.status_progress} max="100" />
        </div>
        <StatusBoardTable {...this.state} />
      </Fragment>
    );
  }


};

export default StatusBoard;