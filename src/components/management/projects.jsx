import React from 'react';
import Table from 'react-table';
import { FaRegTrashAlt } from 'react-icons/fa';
import './menuStyle.css';
import {
  getProjects,
  deleteProject,
  saveProject
} from '../../services/projectServices';
import ToolBar from './basicToolBar';
import DeleteAlert from './alertDeletionModal';
import NoSelectionAlert from './alertNoSelectionModal';
import ProjectCreationForm from './projectCreationForm';

const messages = {
  deleteSingle: 'Delete the project? This cannot be undone.',
  deleteSelected: 'Delete selected projects? This cannot be undone.',
  noSelection: 'Please select a project'
};

//TODO only owner can delete the project

class Projects extends React.Component {
  state = {
    user: '',
    data: [],
    selected: {},
    selectAll: 0,
    error: false,
    singleDeleteId: '',
    hasDeleteSingleClicked: false,
    hasDeleteAllClicked: false,
    noSelection: false,
    hasAddClicked: false,
    id: '',
    name: '',
    description: '',
    type: 'Private',
    defaultTemplate: ''
  };

  componentDidMount = () => {
    this.getProjectData();
    this.setState({ user: sessionStorage.getItem('username') });
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
      this.setState({ error: true });
    }
  };

  saveNewProject = async () => {
    // http://171.65.102.26:8080/epad/v2/projects/test2/users/ozgetest?role=Owner
    const { name, description, defaultTemplate, id, user, type } = this.state;
    await saveProject(name, description, defaultTemplate, id, user, type);
    this.getProjectData();
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
      hasDeleteAllClicked: false,
      singleDeleteId: '',
      noSelection: false,
      hasAddClicked: false
    });
  };

  deleteAllSelected = async () => {
    let newSelected = Object.assign({}, this.state.selected);
    for (let project in newSelected) {
      if (newSelected[project]) {
        await deleteProject(project);
        delete newSelected[project];
      }
    }
    this.setState({ selected: {}, hasDeleteAllClicked: false });
    this.getProjectData();
  };

  deleteSingleProject = async project => {
    await deleteProject(this.state.singleDeleteId);
    this.setState({ singleDeleteId: '', hasDeleteSingleClicked: false });
    this.getProjectData();
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
        minWidth: 50
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
          // console.log(original.row.checkbox.id);
          // console.log(this.state);
          return (
            <p className="menu-clickable wrapped">
              {original.row.loginNames.join(', ')}
            </p>
          );
        }
      },
      {
        Header: '',
        minWidth: 50,
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
    // console.log('projects data', this.state.data);
    console.log(this.state);
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
          />
        )}
        {this.state.hasDeleteSingleClicked && (
          <DeleteAlert
            message={messages.deleteSingle}
            onCancel={this.handleCancel}
            onDelete={this.deleteSingleProject}
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
          />
        )}
        {/* <Modal
          modalIsOpen={this.state.hasAddClicked}
          closeModal={this.handleCancel}
          parent=".menu-display"
        /> */}
      </div>
    );
  };
}

export default Projects;
