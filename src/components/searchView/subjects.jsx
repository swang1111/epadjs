import React, { useEffect, useState, useCallback } from 'react';
import {
  useTable,
  useExpanded,
  useRowSelect,
  usePagination
} from 'react-table';
import { connect } from 'react-redux';
import propTypes from 'react-table-v6/lib/propTypes';
import ReactTooltip from 'react-tooltip';
import PropagateLoader from 'react-spinners/PropagateLoader';
import Studies from './Studies';
import { selectPatient, clearSelection } from '../annotationsList/action';
// import "react-table-v6/react-table.css";
import { getSubjects } from '../../services/subjectServices';
import { formatDate } from '../flexView/helperMethods';
import { clearCarets } from '../../Utils/aid.js';
import { ConsoleWriter } from 'istanbul-lib-report';
import './searchView.css';

const IndeterminateCheckbox = React.forwardRef(
  ({ indeterminate, ...rest }, ref) => {
    const defaultRef = React.useRef();
    const resolvedRef = ref || defaultRef;
    const [checked, setChecked] = useState(false);

    React.useEffect(() => {
      resolvedRef.current.indeterminate = indeterminate;
    }, [resolvedRef, indeterminate]);

    const handleOnMouseDown = () => {
      rest.validateSubjectSelect();
    };

    const handleSelect = e => {
      const { selectRow, data } = rest;
      setChecked(e.target.checked);
      selectRow(data);
    };

    return (
      <>
        <input
          type="checkbox"
          ref={resolvedRef}
          {...rest}
          // onMouseDown={handleOnMouseDown}
          onChange={handleSelect}
          checked={checked}
        />
      </>
    );
  }
);
const defaultPageSize = 200;

function Table({
  columns,
  data,
  fetchData,
  pageCount,
  loading,
  filterSubjects,
  selectRow,
  getTreeData,
  expandLevel,
  getTreeExpandAll,
  getTreeExpandSingle,
  validateSubjectSelect,
  treeExpand
}) {
  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
    page,
    canPreviousPage,
    canNextPage,
    pageOptions,
    gotoPage,
    nextPage,
    previousPage,
    setPageSize,
    toggleAllRowsExpanded,
    state: { expanded, pageIndex, pageSize }
  } = useTable(
    {
      columns,
      data,
      initialState: {
        pageIndex: 0,
        pageSize: defaultPageSize
      }, // Pass our hoisted table state
      manualPagination: true, // Tell the usePagination
      // hook that we'll handle our own data fetching
      // This means we'll also have to provide our own
      // pageCount.
      pageCount
    },
    useExpanded, // Use the useExpanded plugin hook
    usePagination,
    useRowSelect

    // hooks => {
    //   hooks.visibleColumns.push(columns => {
    //     const cols = [...columns];
    //     const checkbox = {
    //       id: 'selection',
    //       Cell: ({ row }) => {
    //         return (
    //           <div style={{ paddingRight: '5px' }}>
    //             <IndeterminateCheckbox
    //               {...row.getToggleRowSelectedProps()}
    //               data={row.original}
    //               selectRow={selectRow}
    //               validateSubjectSelect={validateSubjectSelect}
    //             />
    //           </div>
    //         );
    //       }
    //     };
    //     cols.splice(0, 0, checkbox);
    //     return cols;
    //   });
    // }
  );

  useEffect(() => {
    if (expandLevel === 1) {
      toggleAllRowsExpanded(true);
      getTreeExpandAll({ patient: data.length }, true, expandLevel);
    }
    if (expandLevel === 0) {
      toggleAllRowsExpanded(false);
      getTreeExpandAll({ patient: data.length }, false, expandLevel);
    }
  }, [expandLevel]);

  React.useEffect(() => {
    fetchData({ pageIndex, pageSize })
  }, [fetchData, pageIndex, pageSize])


  const jumpToHeader = () => {
    // const header = document.getElementById('subjects-header-id');
    const header = document.getElementById('epad-logo');
    const bodyRect = document.body.getBoundingClientRect();
    var headerRect = header.getBoundingClientRect();
    const offsetTop = headerRect.top - bodyRect.top;
    const offsetLeft = headerRect.left - bodyRect.left;

    console.log('top, left -->', offsetTop, offsetLeft);
    // window.scrollTo(left, top);
  };

  return (
    <>
      {data.length > 0 && (
        <>
          <label>
            {' '}
            Search subject:
            <input
              type="text"
              onChange={e => filterSubjects(e, pageSize, pageIndex)}
            />
          </label>
          <table
            {...getTableProps()}
            style={{ width: '-webkit-fill-available' }}
          >
            <thead>
              {headerGroups.map((headerGroup, k) => (
                <tr
                  id="subjects-header-id"
                  key={`subjects-header-id ${k}`}
                  {...headerGroup.getHeaderGroupProps()}
                >
                  {headerGroup.headers.map((column, z) => (
                    <th {...column.getHeaderProps()} key={`header-col-${z}`}>
                      {column.render('Header')}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody {...getTableBodyProps()}>
              {rows.map((row, i) => {
                prepareRow(row);
                const expandRow = row.isExpanded || treeExpand[row.index];
                const style = { height: '2.5rem', background: '#1e2125' };
                // if (i%2 === 0) style.background = '#32353b';
                return (
                  <React.Fragment key={`row-fragment-${i}`}>
                    <tr
                      {...row.getRowProps()}
                      style={style}
                      key={`subject-row ${i}`}
                      // className={`new-table--row${i%2}`}
                    >
                      {row.cells.map((cell, z) => {
                        return (
                          <td {...cell.getCellProps()} key={`row-col-${z}`}>
                            {cell.render('Cell')}
                          </td>
                        );
                      })}
                    </tr>
                    {expandRow && (
                      <Studies
                        pid={row.original.projectID}
                        subjectID={row.original.subjectID}
                        getTreeData={getTreeData}
                        expandLevel={expandLevel}
                        patientIndex={row.index}
                        getTreeExpandAll={getTreeExpandAll}
                        treeExpand={treeExpand}
                        getTreeExpandSingle={getTreeExpandSingle}
                        // validateTreeRowSelection={validateTreeRowSelection}
                      />
                    )}
                  </React.Fragment>
                );
              })}
              {pageCount > 1 && (
                <tr>
                  {loading ? (
                    // Use our custom loading state to show a loading indicator
                    <td colSpan="10000">Loading...</td>
                  ) : (
                    <td colSpan="10000">
                      Showing {defaultPageSize * pageIndex}-
                      {defaultPageSize * (pageIndex + 1)} of ~
                      {pageCount * pageSize} results
                    </td>
                  )}
                </tr>
              )}
            </tbody>
          </table>
          {pageCount > 1 && (
            <div className="pagination">
              <button
                onClick={() => {
                  jumpToHeader();
                  previousPage();
                }}
                disabled={!canPreviousPage}
              >
                {'<'}
              </button>
              <select
                value={pageSize}
                onChange={e => {
                  setPageSize(Number(e.target.value));
                }}
              >
                {[200].map((pageSize, i) => (
                  <option key={`${pageSize}-${i}`} value={pageSize}>
                    {pageSize}
                  </option>
                ))}
              </select>
              <button
                onClick={() => {
                  jumpToHeader();
                  nextPage();
                }}
                disabled={!canNextPage}
              >
                {'>'}
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}

function Subjects(props) {
  const widthUnit = 20;

  const [data, setData] = useState([]);
  const [searchKey, setSearchKey] = useState('');
  let [loading, setLoading] = useState(false);
  const [pageCount, setPageCount] = useState(0);
  const [selectedLevel, setSelectedLevel] = useState(false);
  // let [color, setColor] = useState('#ffffff');

  useEffect(() => {
    const {
      selectedPatients,
      selectedStudies,
      selectedSeries,
      selectedAnnotations
    } = props;
    const studies = Object.values(selectedStudies);
    const series = Object.values(selectedSeries);
    const annotations = Object.values(selectedAnnotations);
    const patients = Object.values(selectedPatients);

    if (studies.length) {
      setSelectedLevel('studies');
    } else if (series.length) {
      setSelectedLevel('series');
    } else if (annotations.length) {
      setSelectedLevel('annotationss');
    } else if (patients.length) {
      setSelectedLevel('');
    }
  }, [props.selectedStudies, props.selectedSeries, props.selectedAnnotations]);

  const columns = React.useMemo(
    () => [
      // { id: 'space', Cell: () => <span style={{ paddingLeft: '1px' }}></span> },
      {
        // Build our expander column
        id: 'expander', // Make sure it has an ID
        width: 35,
        Cell: ({ row, toggleRowExpanded }) => {
          // Use the row.canExpand and row.getToggleRowExpandedProps prop getter
          // to build the toggle for expanding a row
          const style = { display: 'flex', width: 'fit-content' };
          return (
            <div className="tree-combinedCell" style={style}>
              <input
                type="checkbox"
                style={{ marginRight: '5px' }}
                // ref={resolvedRef}
                // {...rest}
                // onMouseDown={handleOnMouseDown}
                // onChange={handleSelect}
                // checked={checked}
              />
              <span
                {...row.getToggleRowExpandedProps({
                  style: {
                    // We can even use the row.depth property
                    // and paddingLeft to indicate the depth
                    // of the row
                    cursor: 'pointer',
                    fontSize: 10,
                    padding: '0',
                    textAlign: 'center',
                    userSelect: 'none',
                    color: '#fafafa',
                    verticalAlign: 'middle'
                  }
                })}
                onClick={() => {
                  const expandStatus = row.isExpanded ? false : true;
                  const obj = {
                    patient: { [row.index]: expandStatus ? {} : false }
                  };
                  toggleRowExpanded(row.id, expandStatus);
                  props.getTreeExpandSingle(obj);
                }}
              >
                {row.isExpanded ? <span>&#x25BC;</span> : <span>&#x25B6;</span>}
              </span>
            </div>
          );
        },
        SubCell: () => null
      },
      {
        Header: (
          <div className="search-header__col--left">Description/Name</div>
        ),
        width: widthUnit * 13,
        id: 'searchView-desc',
        resizable: true,
        sortable: true,
        accessor: 'subjectName',
        Cell: ({ row, rows }) => {
          const desc = clearCarets(row.original.subjectName);
          const id = 'desc-tool' + row.original.subjectID;
          return (
            <>
              <span data-tip data-for={id} style={{ whiteSpace: 'pre-wrap' }}>
                {desc}
              </span>
              <ReactTooltip id={id} place="right" type="info" delayShow={500}>
                <span>{desc}</span>
              </ReactTooltip>
            </>
          );
        },
        SubCell: cellProps => <>{cellProps.value} 🎉</>
      },
      {
        Header: (
          <div className="search-header__col badge-flex">
            <span> # of </span>
            <span> aims </span>
          </div>
        ),
        width: widthUnit * 2,
        id: 'searchView-aims',
        resizable: false,
        sortable: false,
        Cell: ({ row }) => {
          return (
            <div className="searchView-table__cell">
              {row.original.numberOfAnnotations === 0 ? (
                ''
              ) : (
                <span className="badge badge-secondary">
                  {row.original.numberOfAnnotations}
                </span>
              )}
            </div>
          );
        }
      },
      {
        Header: (
          <div className="search-header__col badge-flex">
            <span># of </span>
            <span> sub </span>
          </div>
        ),
        width: widthUnit * 3,
        id: 'searchView-sub',
        resizable: false,
        sortable: false,
        Cell: ({ row }) => (
          <div className="searchView-table__cell">
            {row.original.numberOfStudies === 0 ? (
              ''
            ) : (
              <span className="badge badge-secondary">
                {row.original.numberOfStudies}
              </span>
            )}
          </div>
        )
      },
      {
        Header: (
          <div className="search-header__col badge-flex">
            <span> # of </span>
            <span> images </span>
          </div>
        ),
        width: widthUnit * 3,
        id: 'searchView-img',
        resizable: false,
        sortable: false,
        // minResizeWidth: widthUnit * 3,
        Cell: row => <div />
      },
      {
        Header: <div className="search-header__col">Type</div>,
        width: widthUnit * 5,
        id: 'searchView-type',
        resizable: false,
        sortable: false,
        // minResizeWidth: widthUnit * 5,
        Cell: ({ row }) => (
          <div style={{ textAlign: 'center' }}>
            {row.original.examTypes.join('/')}
          </div>
        )
      },
      {
        Header: <div className="search-header__col">Creation date</div>,
        width: widthUnit * 7,
        id: 'searchView-crDate',
        resizable: false,
        sortable: false,
        // minResizeWidth: widthUnit * 10,
        Cell: ({ row }) => <div />
      },
      {
        Header: <div className="search-header__col">Upload date</div>,
        width: widthUnit * 7,
        id: 'searchView-upldDate',
        resizable: false,
        sortable: true,
        accessor: 'insertDate',
        // minResizeWidth: widthUnit * 10,
        Cell: ({ row }) => (
          <div style={{ textAlign: 'center' }}>
            {formatDate(row.original.insertDate)}
          </div>
        )
      },
      {
        Header: <div className="search-header__col">Accession</div>,
        width: widthUnit * 5,
        id: 'searchView-access',
        resizable: false,
        // minResizeWidth: widthUnit * 4,
        Cell: row => <div />
      },
      {
        Header: <div className="search-header__col">Identifier</div>,
        width: widthUnit * 10,
        // minResizeWidth: widthUnit * 12,
        id: 'searchView-UID',
        resizable: false,
        sortable: false,
        Cell: ({ row }) => {
          const id = 'id-tool' + row.original.subjectID;
          return (
            <>
              <div className="searchView-table__cell" data-tip data-for={id}>
                {row.original.subjectID}
              </div>
              <ReactTooltip
                id={id}
                place="top"
                type="info"
                delayShow={500}
                clickable={true}
              >
                <span>{row.original.subjectID}</span>
              </ReactTooltip>
            </>
          );
        }
      }
    ],
    []
  );

  const validateSubjectSelect = () => {
    if (selectedLevel) {
      const message = `There are already selected ${selectedLevel}. Please deselect those if you want to select a subject!`;
      window.alert(message);
    }
  };

  const selectRow = (data, checked) => {
    // if (!props.validateTreeRowSelection('subject')) {
    props.dispatch(clearSelection('patient'));
    props.dispatch(selectPatient(data));
    // }
  };

  const fetchData = useCallback(({ pageIndex, pageSize }) => {
    console.log('in fetch data', pageIndex, pageSize);
    if (searchKey) {
      filterSubjects(searchKey, pageSize, pageIndex);
    } else {
      const pageData = getDataFromStorage(pageSize, pageIndex);
      setData(pageData);
    }
  }, []);

  const preparePageData = (rawData, pageSize, pageIndex) => {
    setPageCount(Math.ceil(rawData.length / pageSize));
    const startIndex = pageSize * pageIndex;
    const endIndex = pageSize * (pageIndex + 1);
    const pageData = [];
    rawData.forEach((el, i) => {
      if (i >= startIndex && i < endIndex) {
        el.data ? pageData.push(el.data) : pageData.push(el);
      }
    });
    return pageData;
  };

  const getDataFromStorage = (pageSize, pageIndex) => {
    const treeData = JSON.parse(localStorage.getItem('treeData'));
    const subjectsArray = treeData[props.pid]
      ? Object.values(treeData[props.pid])
      : [];
    if (subjectsArray.length > 0) {
      if (pageSize && pageIndex >= 0)
        return preparePageData(subjectsArray, pageSize, pageIndex);
      else return subjectsArray;
    } else return [];
  };

  const filterSubjects = (e, pageSize, pageIndex) => {
    const searchKey = e.target.value.trim().toLowerCase();
    setSearchKey(searchKey);
    setFilteredData(searchKey, pageSize, pageIndex);
  };

  const setFilteredData = (searchKey, pageSize, pageIndex) => {
    const filteredData = filterSubjectsInTreeeData(searchKey);
    const pageData = preparePageData(filteredData, pageSize, pageIndex);
    setData(pageData);
    setPageCount(Math.ceil(pageData.length / defaultPageSize));
  };

  const filterSubjectsInTreeeData = searchKey => {
    const subjectsArr = getDataFromStorage();
    const result = subjectsArr.reduce((all, item, i) => {
      const name = clearCarets(item.data.subjectName).toLowerCase();
      if (name.includes(searchKey)) all.push(item.data);
      return all;
    }, []);
    return result;
  };

  const sortSubjectName = list => {
    let result = list.sort(function(a, b) {
      if (a.subjectName < b.subjectName) {
        return -1;
      }
      if (a.subjectName > b.subjectName) {
        return 1;
      }
      return 0;
    });
    return result;
  };

  useEffect(() => {
    const { pid, getTreeData } = props;
    // const treeData = JSON.parse(localStorage.getItem('treeData'));
    const dataFromStorage = getDataFromStorage(defaultPageSize, 0);
    // check if there is data in treedata
    // if there is use it if not get it and post data back to app
    let data = [];
    if (pid && pid !== 'null') {
      if (dataFromStorage?.length > 0) {
        data = sortSubjectName(dataFromStorage);
        setData(data);
      } else {
        setLoading(true);
        getSubjects(pid)
          .then(res => {
            setLoading(false);
            data = preparePageData(res.data, defaultPageSize, 0);
            getTreeData(pid, 'subject', res.data);
            setData(data);
          })
          .catch(err => {
            console.error(err);
          });
      }
    }
  }, []);

  return (
    <>
      {loading && (
        <div style={{ width: 'fit-content', margin: 'auto', marginTop: '10%' }}>
          <PropagateLoader color={'#7A8288'} loading={loading} margin={8} />
        </div>
      )}
      <Table
        columns={columns}
        data={data}
        pageCount={pageCount}
        fetchData={fetchData}
        filterSubjects={filterSubjects}
        getTreeData={props.getTreeData}
        selectRow={selectRow}
        expandLevel={props.expandLevel}
        getTreeExpandAll={props.getTreeExpandAll}
        getTreeExpandSingle={props.getTreeExpandSingle}
        treeExpand={props.treeExpand}
        validateSubjectSelect={validateSubjectSelect}
        // validateTreeRowSelection={props.validateTreeRowSelection}
      />
    </>
  );
}

const mapStateToProps = state => {
  return {
    selectedPatients: state.annotationsListReducer.selectedPatients,
    selectedStudies: state.annotationsListReducer.selectedStudies,
    selectedSeries: state.annotationsListReducer.selectedSeries,
    selectedAnnotations: state.annotationsListReducer.selectedAnnotations
  };
};

export default connect(mapStateToProps)(Subjects);
