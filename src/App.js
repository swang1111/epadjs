import React, { Component } from "react";
import { Route, Switch, Redirect, withRouter } from "react-router-dom";
import { connect } from "react-redux";
import { ToastContainer } from "react-toastify";
import { EventSourcePolyfill } from "event-source-polyfill";
import Keycloak from "keycloak-js";
import { getUser, createUser } from "./services/userServices";
import NavBar from "./components/navbar";
import Sidebar from "./components/sideBar/sidebar";
import SearchView from "./components/searchView/searchView";
import DisplayView from "./components/display/displayView";
import AnotateView from "./components/anotateView";
import ProgressView from "./components/progressView";
import FlexView from "./components/flexView";
import NotFound from "./components/notFound";
import LoginForm from "./components/loginForm";
import Logout from "./components/logout";
import ProtectedRoute from "./components/common/protectedRoute";
import Cornerstone from "./components/cornerstone/cornerstone";
import Management from "./components/management/mainMenu";
import InfoMenu from "./components/infoMenu";
import UserMenu from "./components/userProfileMenu.jsx";
import AnnotationList from "./components/annotationsList";
// import AnnotationsDock from "./components/annotationsList/annotationDock/annotationsDock";
import auth from "./services/authService";
import MaxViewAlert from "./components/annotationsList/maxViewPortAlert";
import {
  clearAimId,
  getNotificationsData
} from "./components/annotationsList/action";
import Worklist from "./components/sideBar/sideBarWorklist";

import "react-toastify/dist/ReactToastify.css";
import "./App.css";

class App extends Component {
  constructor(props) {
    super(props);
    this.eventSource = null;
    this.state = {
      openMng: false,
      keycloak: null,
      authenticated: false,
      openInfo: false,
      openUser: false,
      projectMap: {},
      viewType: "search",
      lastEventId: null,
      showLog: false,
      admin: false,
      progressUpdated: 0,
      treeExpand: {},
      expandLevel: 0,
      maxLevel: 0,
      refTree: {},
      numOfPresentStudies: 0,
      numOfPresentSeries: 0,
      numOfPatientsLoaded: 0,
      numOfStudiesLoaded: 0,
      numOfSeriesLoaded: 0,
      treeData: {}
    };
  }

  getTreeExpandAll = (expandObj, expanded, expandLevel) => {
    const { patient, study, series } = expandObj;
    let treeExpand = { ...this.state.treeExpand };
    let refPatients, refStudies, subSeries, subStudies;
    const patientLevel = patient && !study && !series;
    const studyLevel = study && !series;
    const seriesLevel = series;
    if (patientLevel) {
      if (expanded) {
        for (let i = 0; i < patient; i += 1) treeExpand[i] = {};
        if (expandLevel >= this.state.maxLevel)
          this.setState({ maxLevel: expandLevel, refTree: treeExpand });
      }
      if (!expanded) {
        for (let i = 0; i < patient; i += 1) {
          treeExpand[i] = false;
        }
      }
    }

    if (studyLevel) {
      refPatients = Object.values(this.state.refTree);
      for (let i = 0; i < refPatients.length; i += 1) {
        if (!treeExpand[i]) treeExpand[i] = {};
      }
      if (expanded) {
        for (let i = 0; i < study; i += 1) {
          treeExpand[patient][i] = {};
        }
        if (expandLevel >= this.state.maxLevel)
          this.setState({ maxLevel: expandLevel, refTree: treeExpand });
      }
      if (!expanded) {
        for (let i = 0; i < study; i += 1) {
          treeExpand[patient][i] = false;
        }
      }
    }

    if (seriesLevel) {
      refPatients = Object.values(this.state.refTree);
      for (let i = 0; i < refPatients.length; i += 1) {
        refStudies = Object.values(refPatients[i]);
        if (!treeExpand[i]) {
          treeExpand[i] = {};
        }
        for (let k = 0; k < refStudies.length; k++) {
          treeExpand[i][k] = {};
        }
      }
      if (expanded) {
        for (let i = 0; i < series; i += 1) {
          treeExpand[patient][study][i] = {};
        }
        if (expandLevel >= this.state.maxLevel)
          this.setState({ maxLevel: expandLevel, refTree: treeExpand });
      }
      if (!expanded) {
        for (let i = 0; i < study; i += 1) {
          treeExpand[patient][study][i] = false;
        }
      }
    }
    this.setState({ treeExpand });
  };

  getTreeExpandSingle = async expandObj => {
    const { patient, study, series } = expandObj;
    let treeExpand = { ...this.state.treeExpand };
    let index, val;
    const patientLevel = patient && !study && !series;
    const studyLevel = study && !series;
    const seriesLevel = series;

    if (patientLevel) {
      index = Object.keys(patient);
      index = index[0];
      val = Object.values(patient);
      val = val[0];
      treeExpand[index] = val;
    }
    if (studyLevel) {
      index = Object.keys(study);
      index = index[0];

      val = Object.values(study);
      val = val[0];
      treeExpand[patient][index] = val;
    }
    if (seriesLevel) {
      index = Object.keys(series);
      index = index[0];

      val = Object.values(series);
      val = val[0];
      treeExpand[patient][study][index] = val;
    }
    this.setState({ treeExpand });
  };

  getNumOfPatientsLoaded = numOfStudies => {
    this.setState(state => ({
      numOfPatientsLoaded: state.numOfPatientsLoaded + 1,
      numOfPresentStudies: state.numOfPresentStudies + numOfStudies
    }));
  };

  getNumOfStudiesLoaded = numOfSeries => {
    this.setState(state => ({
      numOfStudiesLoaded: state.numOfStudiesLoaded + 1,
      numOfPresentSeries: state.numOfPresentSeries + numOfSeries
    }));
  };

  getNumOfSeriesLoaded = () => {
    this.setState(state => ({
      numOfSeriesLoaded: state.numOfSeriesLoaded + 1
    }));
  };

  updateExpandedLevelNums = (level, numOfChild, numOfParent) => {
    if (level === "subject") {
      this.getNumOfPatientsLoaded(numOfChild, numOfParent);
    } else if (level === "study") {
      this.getNumOfStudiesLoaded(numOfChild, numOfParent);
    } else if (level === "series") {
      this.getNumOfSeriesLoaded(numOfChild, numOfParent);
    }
  };

  getExpandLevel = expandLevel => {
    this.setState({ expandLevel });
  };

  handleShrink = async () => {
    const { expandLevel } = this.state;
    if (expandLevel > 0) {
      await this.setState(state => ({ expandLevel: state.expandLevel - 1 }));
      if (expandLevel === 0) {
        this.setState({
          numOfPresentStudies: 0,
          numOfPresentSeries: 0,
          numOfPatientsLoaded: 0,
          numOfStudiesLoaded: 0,
          numOfSeriesLoaded: 0
        });
      }
      if (expandLevel === 1) {
        this.setState({ numOfPresentStudies: 0, numOfPatientsLoaded: 0 });
      }
      if (expandLevel === 2) {
        this.setState({ numOfPresentSeries: 0, numOfStudiesLoaded: 0 });
      }
      if (expandLevel === 3) {
        this.setState({ numOfSeriesLoaded: 0 });
      }
    }
  };

  closeMenu = notification => {
    // if (event && event.type === "keydown") {
    //   if (event.key === 'Escape' || event.keyCode === 27) {
    //     this.setState({ openMng: false });
    //   }
    // }
    this.setState({
      openMng: false,
      openInfo: false,
      openUser: false,
      openMenu: false
    });
    if (notification) this.updateNotificationSeen();
  };

  switchView = viewType => {
    this.setState({ viewType });
  };

  handleMngMenu = () => {
    this.setState(state => ({
      openInfo: false,
      openMng: !state.openMng,
      openUser: false
    }));
  };

  handleInfoMenu = () => {
    this.setState(state => ({
      openInfo: !state.openInfo,
      openMng: false,
      openUser: false
    }));
  };

  handleUserProfileMenu = () => {
    this.setState(state => ({
      openInfo: false,
      openMng: false,
      openUser: !state.openUser
    }));
  };

  updateProgress = () => {
    this.setState(state => ({ progressUpdated: state.progressUpdated + 1 }));
  };

  getProjectMap = projectMap => {
    this.setState({ projectMap });
  };
  async componentDidMount() {
    fetch("/config.json")
      .then(async res => {
        const data = await res.json();
        let { mode, apiUrl, wadoUrl } = data;
        // check and use environment variables if any
        mode = process.env.REACT_APP_MODE || mode;
        apiUrl = process.env.REACT_APP_API_URL || apiUrl;
        wadoUrl = process.env.REACT_APP_WADO_URL || wadoUrl;
        sessionStorage.setItem("mode", mode);
        sessionStorage.setItem("apiUrl", apiUrl);
        sessionStorage.setItem("wadoUrl", wadoUrl);
        this.setState({ mode, apiUrl, wadoUrl });
        this.completeAutorization(apiUrl);
      })
      .catch(err => {
        console.log(err);
      });

    fetch("/keycloak.json")
      .then(async res => {
        const data = await res.json();
        const auth = process.env.REACT_APP_AUTH_URL || data["auth-server-url"];
        const keycloak = data;
        // check and use environment variables if any
        keycloak.realm = process.env.REACT_APP_AUTH_REALM || keycloak.realm;
        keycloak["auth-server-url"] =
          process.env.REACT_APP_AUTH_URL || keycloak["auth-server-url"];
        keycloak["ssl-required"] =
          process.env.REACT_APP_AUTH_SSL_REQUIRED || keycloak["ssl-required"];
        keycloak.resource =
          process.env.REACT_APP_AUTH_RESOURCE || keycloak.resource;
        keycloak["public-client"] =
          process.env.REACT_APP_AUTH_PUBLIC_CLIENT || keycloak["public-client"];
        keycloak["confidential-port"] =
          process.env.REACT_APP_AUTH_CONFIDENTIAL_PORT ||
          keycloak["confidential-port"];
        sessionStorage.setItem("auth", auth);
        console.log("keycloakJson", keycloakJson);
        sessionStorage.setItem("keycloakJson", keycloakJson);
      })
      .catch(err => {
        console.log(err);
      });
    //get notifications from sessionStorage and setState
    let notifications = sessionStorage.getItem("notifications");
    if (!notifications) {
      sessionStorage.setItem("notifications", JSON.stringify([]));
      this.setState({ notifications: [] });
    } else {
      notifications = JSON.parse(notifications);
      this.setState({ notifications });
    }
  }

  completeAutorization = apiUrl => {
    const keycloak = Keycloak(sessionStorage.getItem("keycloakJson"));
    console.log("keycloak", keycloak);
    let keycloakInit = new Promise((resolve, reject) => {
      keycloak.init({ onLoad: "login-required" }).then(authenticated => {
        // this.setState({ keycloak: keycloak, authenticated: authenticated });
        keycloak.loadUserInfo().then(userInfo => {
          // let user = { id: userInfo.email, displayname: userInfo.given_name };
          // this.setState({
          //   name: userInfo.name,
          //   user,
          //   id: userInfo.sub
          // });
          resolve({ userInfo, keycloak, authenticated });
          // reject("Authentication failed!");
        });
      });
    });
    keycloakInit
      .then(async result => {
        let user = {
          user: result.userInfo.preferred_username || result.userInfo.email,
          displayname: result.userInfo.given_name
        };
        await auth.login(user, null, result.keycloak.token);
        this.setState({
          keycloak: result.keycloak,
          authenticated: result.authenticated,
          id: result.userInfo.sub,
          user
        });
        const {
          email,
          family_name,
          given_name,
          preferred_username
        } = result.userInfo;
        const username = preferred_username || email;

        let userData;
        try {
          userData = await getUser(username);
          this.setState({ admin: userData.data.admin });
        } catch (err) {
          // console.log(err);
          createUser(username, given_name, family_name, email)
            .then(async () => {
              {
                console.log(`User ${username} created!`);
              }
            })
            .catch(error => console.log(error));
          console.log(err);
        }

        this.eventSource = new EventSourcePolyfill(`${apiUrl}/notifications`, {
          headers: {
            authorization: `Bearer ${result.keycloak.token}`
          }
        });
        this.eventSource.addEventListener(
          "message",
          this.getMessageFromEventSrc
        );
      })
      .catch(err2 => {
        console.log(err2);
      });
  };
  getMessageFromEventSrc = res => {
    const parsedRes = JSON.parse(res.data);
    const { lastEventId } = res;
    const { params, createdtime, projectID, error } = parsedRes.notification;
    const action = parsedRes.notification.function;
    const complete = action.startsWith("Upload") || action.startsWith("Delete");
    const message = params;
    if (complete)
      this.props.dispatch(getNotificationsData(projectID, lastEventId));
    let time = new Date(createdtime).toString();
    const GMTIndex = time.indexOf(" G");
    time = time.substring(0, GMTIndex - 3);
    let notifications = [...this.state.notifications];
    notifications.unshift({
      message,
      time,
      seen: false,
      action,
      error
    });
    this.setState({ notifications });
    const stringified = JSON.stringify(notifications);
    sessionStorage.setItem("notifications", stringified);
  };

  componentWillUnmount = () => {
    this.eventSource.removeEventListener(
      "message",
      this.getMessageFromEventSrc
    );
  };

  onLogout = e => {
    auth.logout();
    // sessionStorage.removeItem("annotations");
    sessionStorage.setItem("notifications", JSON.stringify([]));
    this.setState({
      authenticated: false,
      id: null,
      name: null,
      user: null
    });
    this.state.keycloak.logout().then(() => {
      this.setState({
        keycloak: null
      });
      auth.logout();
    });
  };

  updateNotificationSeen = () => {
    const notifications = [...this.state.notifications];
    notifications.forEach(notification => {
      notification.seen = true;
    });
    this.setState({ notifications });
    const stringified = JSON.stringify(notifications);
    sessionStorage.setItem("notifications", stringified);
  };

  switchSearhView = () => {
    this.props.dispatch(clearAimId());
  };

  handleCloseAll = () => {
    this.setState({
      expandLevel: 0,
      numOfPresentStudies: 0,
      numOfPresentSeries: 0,
      numOfPatientsLoaded: 0,
      numOfStudiesLoaded: 0,
      numOfSeriesLoaded: 0
    });
  };

  getTreeData = (level, data) => {
    const treeData = { ...this.state.treeData };
    const patientIDs = [];
    if (level === "subject") {
      data.forEach(el => {
        if (!treeData[el.subjectID])
          treeData[el.subjectID] = { data: el, studies: {} };
        patientIDs.push(el.subjectID);
      });
      if (data.length < Object.keys(treeData).length) {
        for (let patient in treeData) {
          if (!patientIDs.includes(patient)) {
            delete treeData[patient];
          }
        }
      }
    } else if (level === "studies") {
      const studyUIDs = [];
      const patientID = data[0].patientID;
      data.forEach(el => {
        if (!treeData[el.patientID].studies[el.studyUID]) {
          treeData[el.patientID].studies[el.studyUID] = {
            data: el,
            series: {}
          };
        }
        studyUIDs.push(el.studyUID);
      });
      const studiesObj = treeData[patientID].studies;
      const studiesArr = Object.values(studiesObj);
      if (data.length < studiesArr.length) {
        for (let study in studiesObj) {
          if (!studyUIDs.includes(study)) {
            delete studiesObj[study];
          }
        }
      }
    } else if (level === "series") {
      const patientID = data[0].patientID;
      const studyUID = data[0].studyUID;
      const seriesUIDs = [];
      data.forEach(el => {
        if (!treeData[el.patientID].studies[el.studyUID].series[el.seriesUID]) {
          treeData[el.patientID].studies[el.studyUID].series[el.seriesUID] = {
            data: el
          };
        }
        seriesUIDs.push(el.seriesUID);
      });
      const seriesObj = treeData[patientID].studies[studyUID].series;
      const seriesArr = Object.values(seriesObj);
      if (data.length < seriesArr.length) {
        for (let series in seriesObj) {
          if (!seriesUIDs.includes(series)) {
            delete seriesObj[series];
          }
        }
      }
    }
    this.setState({ treeData });
  };

  render() {
    const {
      notifications,
      mode,
      progressUpdated,
      treeExpand,
      expandLevel
    } = this.state;
    const expandLoading = {
      numOfPresentStudies: this.state.numOfPresentStudies,
      numOfPresentSeries: this.state.numOfPresentSeries,
      numOfPatientsLoaded: this.state.numOfPatientsLoaded,
      numOfStudiesLoaded: this.state.numOfStudiesLoaded,
      numOfSeriesLoaded: this.state.numOfSeriesLoaded
    };
    let noOfUnseen;
    if (notifications) {
      noOfUnseen = notifications.reduce((all, item) => {
        if (!item.seen) all += 1;
        return all;
      }, 0);
    }
    return (
      <React.Fragment>
        <Cornerstone />
        <ToastContainer />
        <NavBar
          user={this.state.user}
          openGearMenu={this.handleMngMenu}
          openInfoMenu={this.handleInfoMenu}
          openUser={this.handleUserProfileMenu}
          logout={this.onLogout}
          onSearchViewClick={this.switchSearhView}
          onSwitchView={this.switchView}
          viewType={this.state.viewType}
          notificationWarning={noOfUnseen}
        />
        {this.state.openMng && (
          <Management
            closeMenu={this.closeMenu}
            projectMap={this.state.projectMap}
            updateProgress={this.updateProgress}
          />
        )}
        {this.state.openInfo && (
          <InfoMenu
            closeMenu={this.closeMenu}
            user={this.state.user}
            notifications={notifications}
            notificationWarning={noOfUnseen}
          />
        )}
        {this.state.openUser && (
          <UserMenu
            closeMenu={this.closeMenu}
            user={this.state.user}
            admin={this.state.admin}
          />
        )}
        {!this.state.authenticated && mode !== "lite" && (
          <Route path="/login" component={LoginForm} />
        )}
        {this.state.authenticated && mode !== "lite" && (
          <div style={{ display: "inline", width: "100%", height: "100%" }}>
            <Sidebar onData={this.getProjectMap} type={this.state.viewType}>
              <Switch className="splitted-mainview">
                <Route path="/logout" component={Logout} />
                <ProtectedRoute
                  path="/display"
                  component={DisplayView}
                  test={"test"}
                />
                <ProtectedRoute
                  path="/search/:pid?"
                  render={props => (
                    <SearchView
                      {...props}
                      updateProgress={this.updateProgress}
                      progressUpdated={progressUpdated}
                      expandLevel={this.state.expandLevel}
                      getExpandLevel={this.getExpandLevel}
                      expandLoading={expandLoading}
                      updateExpandedLevelNums={this.updateExpandedLevelNums}
                    />
                  )}
                />
                <ProtectedRoute path="/anotate" component={AnotateView} />
                <ProtectedRoute
                  path="/progress/:wid?"
                  component={ProgressView}
                />
                <ProtectedRoute path="/flex/:pid?" component={FlexView} />
                <ProtectedRoute path="/worklist/:wid?" component={Worklist} />
                <Route path="/tools" />
                <Route path="/edit" />
                <Route path="/not-found" component={NotFound} />
                <ProtectedRoute
                  from="/"
                  exact
                  to="/search"
                  render={props => (
                    <SearchView
                      {...props}
                      updateProgress={this.updateProgress}
                      progressUpdated={progressUpdated}
                      expandLevel={this.state.expandLevel}
                      getTreeExpandSingle={this.getTreeExpandSingle}
                      treeExpand={treeExpand}
                      getExpandLevel={this.getExpandLevel}
                      expandLoading={expandLoading}
                      updateExpandedLevelNums={this.updateExpandedLevelNums}
                      onShrink={this.handleShrink}
                      onCloseAll={this.handleCloseAll}
                    />
                  )}
                />

                <Redirect to="/not-found" />
              </Switch>
              {/* {this.props.activePort === 0 ? <AnnotationsList /> : null} */}
            </Sidebar>
          </div>
        )}
        {this.state.authenticated && mode === "lite" && (
          <Switch>
            <Route path="/logout" component={Logout} />
            <ProtectedRoute path="/display" component={DisplayView} />
            <Route path="/not-found" component={NotFound} />
            <ProtectedRoute
              path="/"
              render={props => (
                <SearchView
                  {...props}
                  updateProgress={this.updateProgress}
                  progressUpdated={progressUpdated}
                  expandLevel={this.state.expandLevel}
                  getTreeExpandSingle={this.getTreeExpandSingle}
                  getTreeExpandAll={this.getTreeExpandAll}
                  treeExpand={treeExpand}
                  getExpandLevel={this.getExpandLevel}
                  expandLoading={expandLoading}
                  updateExpandedLevelNums={this.updateExpandedLevelNums}
                  onShrink={this.handleShrink}
                  onCloseAll={this.handleCloseAll}
                  treeData={this.state.treeData}
                  getTreeData={this.getTreeData}
                />
              )}
            />
            <Redirect to="/not-found" />
          </Switch>
        )}
        {this.props.showGridFullAlert && <MaxViewAlert />}
        {/* {this.props.selection && (
          <ManagementItemModal selection={this.props.selection} />
        )} */}
      </React.Fragment>
    );
  }
}

const mapStateToProps = state => {
  // console.log(state.annotationsListReducer);
  // console.log(state.managementReducer);
  const {
    showGridFullAlert,
    showProjectModal,
    loading,
    activePort,
    imageID
  } = state.annotationsListReducer;
  return {
    showGridFullAlert,
    showProjectModal,
    loading,
    activePort,
    imageID,
    selection: state.managementReducer.selection
  };
};
export default withRouter(connect(mapStateToProps)(App));
