import { h } from "preact";
import StatusBoard from "../../components/status-board";
import { Config } from "../../index";

const Home = () => {
  return (
    <Config.Consumer>
      {config => {
        return <StatusBoard config={config} />
      }}
    </Config.Consumer>
  );
};

export default Home;
