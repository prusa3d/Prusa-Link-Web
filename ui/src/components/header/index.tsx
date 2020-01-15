import { h, Component } from "preact";
import { Link } from "preact-router/match";
import "./style.scss";
const logo = require('../../assets/connect_black.svg');

interface S {
    is_burger_active: boolean
}

class Header extends Component<{}, S> {

    constructor() {
        super();
        this.state = { is_burger_active: false };
        this.onClickBurger = this.onClickBurger.bind(this);
    }

    onClickBurger() {
        this.setState({ is_burger_active: !this.state.is_burger_active });
    }

    render(props, state) {

        let extra_burger_class = "";
        if (state.is_burger_active) {
            extra_burger_class = "is-active";
        }

        return (
            <nav
                class="navbar is-black prusa-menu"
                role="navigation"
                aria-label="main navigation">
                <div class="navbar-brand">
                    <a
                        class="navbar-item is-shadowless is-paddingless"
                        href="https://www.prusa3d.com/"
                    >
                        <img src={logo} />
                    </a>
                    <a
                        role="button"
                        class={"navbar-burger burger " + extra_burger_class}
                        aria-label="menu"
                        aria-expanded="false"
                        data-target="navbarBasicMenu"
                        onClick={this.onClickBurger}
                    >
                        <span aria-hidden="true"></span>
                        <span aria-hidden="true"></span>
                        <span aria-hidden="true"></span>
                    </a>
                </div>
                <div id="navbarBasicMenu" class={"navbar-menu " + extra_burger_class}>
                    <div class="navbar-end">
                        <Link class="navbar-item prusa-menu-item" activeClassName="active" href="/" onClick={this.onClickBurger}>
                            Dashboard
                        </Link>
                        <Link class="navbar-item prusa-menu-item" activeClassName="active" href="/projects" onClick={this.onClickBurger}>
                            projects
                        </Link>
                        <div class="navbar-item has-text-grey">
                            Temperatures
                        </div>
                        {/* <div class="navbar-item has-text-grey">
                            Account
                        </div> */}
                    </div>
                </div>
            </nav>

        );
    }
}


export default Header;

