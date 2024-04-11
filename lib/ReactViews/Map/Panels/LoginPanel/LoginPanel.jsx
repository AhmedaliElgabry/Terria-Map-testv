"use strict";

import React from "react";
import createReactClass from "create-react-class";
import PropTypes from "prop-types";
import ObserverModelMixin from "../../../ObserveModelMixin";
import { withTranslation } from "react-i18next";
import Styles from "./login-panel.scss";
import classNames from "classnames";
import MenuPanel from "../../../StandardUserInterface/customizable/MenuPanel.jsx";
import triggerResize from "../../../../Core/triggerResize";
import DropdownStyles from "../panel.scss";
import MenuItem from "../../../StandardUserInterface/customizable/MenuItem";
import defined from "terriajs-cesium/Source/Core/defined";
import raiseErrorToUser from "../../../../Models/raiseErrorToUser";

import { clearInterval, clearTimeout, setInterval } from "worker-timers";
import axios from "axios";

const LoginPanel = createReactClass({
  displayName: "LoginPanel",
  mixins: [ObserverModelMixin],
  //   interval: null,
  propTypes: {
    terria: PropTypes.object,
    viewState: PropTypes.object.isRequired,
    t: PropTypes.func.isRequired,
    animationDuration: PropTypes.number
  },
  getInitialState() {
    this.iframeRef = React.createRef();
    return {
      isLoggedIn: false,
      isRefreshingSession: false,
      user: {
        name: undefined,
        email: undefined,
        apiKeyGenerated: undefined
      }
    };
  },

  getDefaultProps() {
    return { minimumLargeScreenWidth: 768 };
  },

  componentDidMount() {
    const that = this;

    this.props.terria.userManagementServices
      .loginOrRefreshSession()
      .then(async response => {
        const { headers } = response; // the response would have email and sub headers which would help identify the user.

        if (
          defined(that.props.terria.configParameters.privateServices) &&
          defined(
            that.props.terria.configParameters.privateServices.generateApiKeys
          ) &&
          that.props.terria.configParameters.privateServices.generateApiKeys
        ) {
          // await for api key
          try {
            const res = await that.props.terria.userManagementServices.getApiKeyStatus();
            that.setState({
              isLoggedIn: true,
              user: {
                name: headers["name"],
                email: headers["email"],
                apiKeyGenerated: res.data.response.enabled
              }
            });
          } catch (error) {
            that.setState({
              isLoggedIn: true,
              user: {
                name: headers["name"],
                email: headers["email"],
                apiKeyGenerated: res.data.response.enabled
              }
            });
          }
        } else {
          that.setState({
            isLoggedIn: true,
            user: {
              name: headers["name"],
              email: headers["email"],
              apiKeyGenerated: undefined
            }
          });
        }
      })
      .catch(error => {
        if (error.response.status === 401) {
          that.setState({
            isRefreshingSession: true
          });
        }
      });

    setInterval(function() {
      that.props.terria.userManagementServices
        .loginOrRefreshSession()
        .then(function(response) {
          that.props.terria.userManagementServices.isLoggedIn = true;
          that.setState({
            isRefreshingSession: true
          });
        })
        .catch(function(error) {
          const response = error.response;
          if (response.status === 401) {
            that.setState({
              isRefreshingSession: true
            });
          }
        });
    }, 2700000);
  },

  handleLoginClick() {
    var redirect_uri =
      window.location.origin +
      "/private?redirect_uri=" +
      window.location.pathname;
    window.location.replace(redirect_uri);
  },

  handleLogoutClick() {
    var redirect_uri =
      window.location.origin +
      "/private?gcp-iap-mode=GCIP_SIGNOUT&redirect_uri=" +
      window.location.pathname;
    window.location.replace(redirect_uri);
  },

  handleSavedAreas(event) {
    event.stopPropagation();
    this.props.viewState.topElement = "AddData";
    this.props.viewState.openUserData();
  },

  notifyUser(title, message) {
    this.props.viewState.notifications.push({
      title: title,
      message: message,
      width: 400
    });
  },

  async handleApiKey(event) {
    event.stopPropagation();
    const that = this;
    if (this.state.apiKeyGenerated) {
      try {
        const res = await this.props.terria.userManagementServices.deleteApiKey();
        if (res.response.data.status == 200) {
          this.notifyUser(
            "Attention!",
            "The key has been revoked. You can create a new key in the profile."
          );
          this.setState({
            user: { ...this.state.user, apiKeyGenerated: false }
          });
        }
      } catch (error) {
        raiseErrorToUser(that.props.terria, error.response.data);
      }
    } else {
      try {
        const res = await this.props.terria.userManagementServices.createApiKey();
        if (res.response.data.status == 201) {
          const key = res.response.data.response.message;
          this.notifyUser(
            "Attention!",
            `This API token is private and should not be shared.<br></br>
            You will be shown this token <b>just once</b>, so make sure you store it in a safe place.<br></br>
            <b>${key}</b> <br></br>
            You can revoke this key in the profile and generate a new one at any time. 
            `
          );
          this.setState({
            user: { ...this.state.user, apiKeyGenerated: true }
          });
        }
      } catch (error) {
        raiseErrorToUser(that.props.terria, error.response.data);
      }
    }
  },

  handleSavedStories() {
    this.props.viewState.storyBuilderShown = !this.props.viewState
      .storyBuilderShown;
    this.props.terria.currentViewer.notifyRepaintRequired();
    // Allow any animations to finish, then trigger a resize.
    setTimeout(function() {
      triggerResize();
    }, this.props.animationDuration || 1);
    this.props.viewState.toggleFeaturePrompt("story", false, true);
  },

  render() {
    const profileTheme = {
      outer: Styles.profilePanel,
      inner: Styles.dropdownInner,
      btn: Styles.btnDropdown,
      icon: "user"
    };

    const refreshingTheme = {
      outer: Styles.profilePanel,
      btn: Styles.btnDropdown,
      icon: "loader"
    };

    const isLoggedIn = this.state.isLoggedIn;
    const isRefreshingSession = this.state.isRefreshingSession;
    const that = this;
    let button;
    if (isLoggedIn) {
      button = (
        <MenuPanel
          id="profileMenuItem"
          theme={profileTheme}
          btnTitle={"Profile"}
          btnText={"Profile"}
          viewState={this.props.viewState}
          smallScreen={this.props.viewState.useSmallScreenInterface}
        >
          <div className={classNames(Styles.viewer, DropdownStyles.section)}>
            <label className={DropdownStyles.heading}> {"Information"} </label>
            <section className={Styles.nativeResolutionWrapper}>
              <section className={Styles.userDetails}>
                <label className={DropdownStyles.subHeading}>
                  Name: {this.state.user.name}
                </label>
                <label className={DropdownStyles.subHeading}>
                  Email: {this.state.user.email}
                </label>
              </section>
              <section className={Styles.userActions}>
                <a
                  className={Styles.profileButton}
                  onClick={this.handleSavedAreas}
                  title="Saved Areas"
                >
                  <span>Saved Areas</span>
                </a>
                <If
                  condition={
                    defined(
                      this.props.terria.configParameters.privateServices
                    ) &&
                    defined(
                      this.props.terria.configParameters.privateServices
                        .generateApiKeys
                    ) &&
                    this.props.terria.configParameters.privateServices
                      .generateApiKeys
                  }
                >
                  <a
                    className={Styles.profileButton}
                    onClick={this.handleApiKey}
                    title={
                      this.state.apiKeyGenerated ? "Revoke Key" : "Generate Key"
                    }
                  >
                    <span>
                      {this.state.apiKeyGenerated
                        ? "Revoke Key"
                        : "Generate Key"}
                    </span>
                  </a>
                </If>

                {/* <a
                  className={Styles.profileButton}
                  onClick={this.handleSavedStories}
                  title="Saved Stories"
                >
                  <span>Saved Stories</span>
                </a> */}
                <a
                  className={Styles.profileButton}
                  onClick={this.handleLogoutClick}
                  title="Logout"
                >
                  <span>Logout</span>
                </a>
              </section>
            </section>
          </div>
        </MenuPanel>
      );
    } else {
      button = (
        <MenuItem
          id="loginMenuItem"
          smallScreen={
            document.body.clientWidth < this.props.minimumLargeScreenWidth
          }
          onClick={this.handleLoginClick}
          caption="Login"
          key="login-key"
        />
      );
    }

    return (
      <div>
        {button}
        <If condition={isRefreshingSession}>
          <iframe
            src="/private/hih-auth-verification?gcp-iap-mode=DO_SESSION_REFRESH"
            width="0px"
            height="0px"
            onLoad={e => {
              that.props.terria.userManagementServices
                .loginOrRefreshSession()
                .then(function(response) {
                  const { headers } = response;
                  that.props.terria.userManagementServices.isLoggedIn = true;
                  that.setState({
                    isLoggedIn: true,
                    isRefreshingSession: false,
                    user: {
                      ...that.state.user,
                      name: headers["name"],
                      email: headers["email"]
                    }
                  });
                })
                .catch(function(error) {
                  const response = error.response;
                  if (response.status === 401) {
                    that.props.terria.userManagementServices.isLoggedIn = false;
                    that.setState({
                      isRefreshingSession: false,
                      isLoggedIn: false,
                      user: {
                        name: undefined,
                        email: undefined,
                        apiKeyGenerated: undefined
                      }
                    });
                  }
                });
            }}
            frameBorder="0"
            marginHeight="0"
            marginWidth="0"
          />
        </If>
      </div>
    );
  }
});

export default withTranslation()(LoginPanel);
