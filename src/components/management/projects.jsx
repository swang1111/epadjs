import React from 'react';
import Table from 'react-table';
import { FaRegTrashAlt, FaEdit, FaRegEye } from 'react-icons/fa';
import './menuStyle.css';
import {
  getProjects,
  deleteProject,
  saveProject,
  updateProject,
  getProjectUsers,
  editUserRole
} from '../../services/projectServices';
import { getUsers } from '../../services/userServices';
import ToolBar from './basicToolBar';
import DeleteAlert from './alertDeletionModal';
import NoSelectionAlert from './alertNoSelectionModal';
import ProjectCreationForm from './projectCreationForm';
import ProjectEditingForm from './projectEditingForm';
import UserRoleEditingForm from './userRoleEditingForm';

const messages = {
  deleteSingle: 'Delete the project? This cannot be undone.',
  deleteSelected: 'Delete selected projects? This cannot be undone.',
  noSelection: 'Please select a project'
};

//NICE TO HAVE
//TODO projects - post default template nedir
//TODO show one error message only
//TODO no selection stateten cikarip renderda calculate et

class Projects extends React.Component {
  state = {
    user: '',
    data: [],
    selected: {},
    selectAll: 0,
    errorMessage: null,
    singleDeleteId: '',
    hasDeleteSingleClicked: false,
    hasDeleteAllClicked: false,
    noSelection: false,
    hasAddClicked: false,
    hasEditClicked: false,
    hasUserRolesClicked: false,
    id: '',
    name: '',
    description: '',
    type: 'Private',
    defaultTemplate: '',
    userRoles: [],
    newRoles: {}
  };

  componentDidMount = () => {
    this.getProjectData();
    this.setState({ user: sessionStorage.getItem('username') });
  };

  handleClickUSerRoles = async id => {
    const userRoles = [];
    try {
      const {
        data: {
          ResultSet: { Result: users }
        }
      } = await getUsers();

      const {
        data: {
          ResultSet: { Result: roles }
        }
      } = await getProjectUsers(id);
      for (let i = 0; i < users.length; i++) {
        for (let k = 0; k < roles.length; k++) {
          if (users[i].username === roles[k].username) {
            userRoles.push({ name: users[i].username, role: roles[k].role });
            break;
          }
        }
        if (userRoles.length !== i + 1) {
          userRoles.push({ name: users[i].username, role: 'None' });
        }
      }
      this.setState({ userRoles });
    } catch (err) {
      // this.setState({ error: true });
    }
  };

  getProjectData = async () => {
    try {
      const {
        data: {
          ResultSet: { Result: data }
        }
      } = await getProjects();
      this.setState({ data });
    } catch (err) {
      // this.setState({ error: true });
    }
  };

  clearProjectInfo = () => {
    this.setState({
      name: '',
      description: '',
      id: '',
      type: 'Private'
    });
  };

  saveNewProject = async () => {
    const { name, description, defaultTemplate, id, user, type } = this.state;
    if (!name || !id) {
      this.setState({ errorMessage: 'Please fill the required fields' });
    } else {
      const postData = saveProject(
        name,
        description,
        defaultTemplate,
        id,
        user,
        type
      );
      postData
        .then(res => {
          if (res.status === 200) {
            this.setState({
              hasAddClicked: false,
              errorMessage: null
            });
            this.clearProjectInfo();
            this.getProjectData();
          }
        })
        .catch(error => {
          this.setState({ errorMessage: error.response.data.message });
        });
    }
  };

  editProject = async () => {
    const { name, description, defaultTemplate, id, type } = this.state;
    console.log('name', name, 'desc', description, type);
    const editData = updateProject(id, name, description, type);

    editData
      .then(res => {
        if (res.status === 200) {
          this.setState({
            hasEditClicked: false,
            errorMessage: null
          });
          this.clearProjectInfo();
          this.getProjectData();
        }
      })
      .catch(error => {
        this.setState({
          errorMessage: error.response.data.message
        });
        this.clearProjectInfo();
      });
  };

  toggleRow = async id => {
    let newSelected = Object.assign({}, this.state.selected);
    newSelected[id] = !this.state.selected[id];
    await this.setState({
      selected: newSelected,
      selectAll: 2
    });

    let values = Object.values(this.state.selected);
    if (!values.includes(true)) {
      this.setState({
        selectAll: 0
      });
    }
  };

  toggleSelectAll() {
    let newSelected = {};
    if (this.state.selectAll === 0) {
      this.state.data.forEach(project => {
        newSelected[project.id] = true;
      });
    }

    this.setState({
      selected: newSelected,
      selectAll: this.state.selectAll === 0 ? 1 : 0
    });
  }

  handleCancel = () => {
    this.setState({
      hasDeleteSingleClicked: false,
      id: '',
      hasDeleteAllClicked: false,
      singleDeleteId: '',
      noSelection: false,
      hasAddClicked: false,
      hasEditClicked: false,
      hasUserRolesClicked: false,
      errorMessage: null
    });
  };

  deleteAllSelected = async () => {
    let newSelected = Object.assign({}, this.state.selected);
    for (let project in newSelected) {
      if (newSelected[project]) {
        deleteProject(project)
          .then(() => {
            delete newSelected[project];
            this.setState({ selected: {}, hasDeleteAllClicked: false });
            this.getProjectData();
          })
          .catch(err => {
            this.setState({ errorMessage: err.response.data.message });
          });
      }
    }
  };

  deleteSingleProject = async () => {
    deleteProject(this.state.singleDeleteId)
      .then(() => {
        this.setState({ singleDeleteId: '', hasDeleteSingleClicked: false });
        this.getProjectData();
      })
      .catch(err => {
        this.setState({ errorMessage: err.response.data.message });
      });
  };

  handleDeleteAll = () => {
    let values = Object.values(this.state.selected);
    let isSelected;
    !values.includes(true)
      ? this.setState({ noSelection: true })
      : this.setState({ hasDeleteAllClicked: true });
  };

  handleSingleDelete = id => {
    this.setState({ hasDeleteSingleClicked: true, singleDeleteId: id });
  };

  handleAddProject = () => {
    this.setState({ hasAddClicked: true });
  };

  handleFormInput = e => {
    const { name, value } = e.target;
    this.setState({ [name]: value });
  };

  handleRoleEditing = e => {
    const { name, value } = e.target;
    const newObj = { [name]: value };
    const oldState = Object.assign({}, this.state.newRoles);
    const newRoles = Object.assign(oldState, newObj);
    console.log('new roles', newRoles);
    this.setState({ newRoles });
  };

  editRoles = async () => {
    const { id } = this.state;
    const editList = [];
    const roles = Object.assign({}, this.state.newRoles);
    for (let prop in roles) {
      editList.push(editUserRole(id, prop, roles[prop]));
      delete roles[prop];
    }
    Promise.all(editList)
      .then(() => {
        this.setState({ newRoles: roles, hasUserRolesClicked: false });
        this.getProjectData();
      })
      .catch(error => {
        this.setState({ errorMessage: error.response.data.message });
      });
  };

  defineColumns = () => {
    return [
      {
        id: 'checkbox',
        accessor: '',
        Cell: ({ original }) => {
          return (
            <input
              type="checkbox"
              className="checkbox"
              checked={this.state.selected[original.id] === true}
              onChange={() => this.toggleRow(original.id)}
            />
          );
        },
        Header: x => {
          return (
            <input
              type="checkbox"
              className="checkbox"
              checked={this.state.selectAll === 1}
              ref={input => {
                if (input) {
                  input.indeterminate = this.state.selectAll === 2;
                }
              }}
              onChange={() => this.toggleSelectAll()}
            />
          );
        },
        sortable: false,
        minResizeWidth: 20,
        width: 45
      },
      {
        Header: 'Name',
        accessor: 'name',
        sortable: true,
        resizable: true,
        minResizeWidth: 20,
        minWidth: 50
      },
      {
        Header: 'Open',
        sortable: true,
        resizable: true,
        minResizeWidth: 20,
        width: 45,
        Cell: original => (
          <FaRegEye className="menu-clickable" onClick={() => console.log()} />
        )
      },
      {
        Header: 'Description',
        accessor: 'description',
        sortable: true,
        resizable: true,
        minResizeWidth: 20,
        minWidth: 50
      },
      {
        Header: 'Type',
        accessor: 'type',
        sortable: true,
        resizable: true,
        minResizeWidth: 20,
        minWidth: 50
      },
      {
        Header: 'Users',
        accessor: 'loginNames',
        sortable: true,
        resizable: true,
        minResizeWidth: 20,
        minWidth: 50,
        Cell: original => {
          return (
            <p
              className="menu-clickable wrapped"
              onClick={async () => {
                await this.handleClickUSerRoles(original.row.checkbox.id);
                this.setState({
                  hasUserRolesClicked: true,
                  id: original.row.checkbox.id
                });
              }}
            >
              {original.row.loginNames.join(', ')}
            </p>
          );
        }
      },
      {
        Header: '',
        width: 45,
        minResizeWidth: 20,
        resizable: true,
        Cell: original => (
          <FaEdit
            className="menu-clickable"
            onClick={() => {
              // console.log(original);
              this.setState({
                hasEditClicked: true,
                id: original.row.checkbox.id,
                name: original.row.checkbox.name,
                description: original.row.checkbox.description,
                type: original.row.checkbox.type
              });
            }}
          />
        )
      },
      {
        Header: '',
        width: 45,
        minResizeWidth: 20,
        resizable: true,
        Cell: original => (
          <FaRegTrashAlt
            className="menu-clickable"
            onClick={() => this.handleSingleDelete(original.row.checkbox.id)}
          />
        )
      }
    ];
  };

  render = () => {
    // console.log(this.state);
    return (
      <div className="projects menu-display" id="projects">
        <ToolBar
          onDelete={this.handleDeleteAll}
          onAdd={this.handleAddProject}
        />
        {this.state.error ? (
          <div>Something went wrong!</div>
        ) : (
          <Table data={this.state.data} columns={this.defineColumns()} />
        )}
        {this.state.hasDeleteAllClicked && (
          <DeleteAlert
            message={messages.deleteSelected}
            onCancel={this.handleCancel}
            onDelete={this.deleteAllSelected}
            error={this.state.errorMessage}
          />
        )}
        {this.state.hasDeleteSingleClicked && (
          <DeleteAlert
            message={messages.deleteSingle}
            onCancel={this.handleCancel}
            onDelete={this.deleteSingleProject}
            error={this.state.errorMessage}
          />
        )}
        {this.state.noSelection && (
          <NoSelectionAlert
            message={messages.noSelection}
            onOK={this.handleCancel}
          />
        )}
        {this.state.hasAddClicked && (
          <ProjectCreationForm
            onType={this.handleFormInput}
            onSubmit={this.saveNewProject}
            error={this.state.errorMessage}
            onCancel={this.handleCancel}
          />
        )}
        {this.state.hasEditClicked && (
          <ProjectEditingForm
            onType={this.handleFormInput}
            onSubmit={this.editProject}
            error={this.state.errorMessage}
            onCancel={this.handleCancel}
            name={this.state.name}
            desc={this.state.description}
          />
        )}
        {this.state.hasUserRolesClicked && (
          <UserRoleEditingForm
            users={this.state.userRoles}
            onCancel={this.handleCancel}
            error={this.state.errorMessage}
            onType={this.handleRoleEditing}
            onSubmit={this.editRoles}
          />
        )}
      </div>
    );
  };
}

export default Projects;
