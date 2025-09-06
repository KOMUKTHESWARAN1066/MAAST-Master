import React, { useEffect, useState, useCallback } from "react";
import axios from "axios";
import {
  Form,
  Container,
  Row,
  Col,
  Table,
  Button,
  Spinner,
  Alert,
  FormControl,
  InputGroup,
  Modal,
  Card,
} from "react-bootstrap";
import { IconButton } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import { FaSort, FaDownload, FaEdit, FaTrash, FaPlus } from "react-icons/fa";
import moment from "moment";
import * as FileSaver from "file-saver";
import * as XLSX from "xlsx";
import "../styles/UserShiftReport.css";

const baseURL = "https://192.168.2.54:443/api";

const UserShiftReport = () => {
  const [userShifts, setUserShifts] = useState([]);
  const [searchUserShift, setSearchUserShift] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDate] = useState("");
  const [selectedShiftIds, setSelectedShiftIds] = useState([]);
  const [selectedStages, setSelectedStages] = useState([]);
  const [selectedLines, setSelectedLines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState("");
  const [selectedFromDate, setSelectedFromDate] = useState(
    moment().format("YYYY-MM-DD")
  );
  const [selectedToDate, setSelectedToDate] = useState(
    moment().format("YYYY-MM-DD")
  );
  const [filteredUserShifts, setFilteredUserShifts] = useState([]);
  const pageSize = 100;
  const [showSearchBar, setShowSearchBar] = useState(false);

  // Line management states
  const [showLineModal, setShowLineModal] = useState(false);
  const [lines, setLines] = useState([]);
  const [editingLine, setEditingLine] = useState(null);
  const [newLineName, setNewLineName] = useState("");
  const [showAddLineForm, setShowAddLineForm] = useState(false);
  const [lineLoading, setLineLoading] = useState(false);
  const [editingLineName, setEditingLineName] = useState(""); // Add this new state

  const fetchUserShifts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${baseURL}/getUserShifts`, {
        params: { date: selectedDate },
      });
      setUserShifts(response.data);
    } catch (error) {
      console.error("Error fetching user shifts:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  // Fetch all lines
  const fetchLines = async () => {
    setLineLoading(true);
    try {
      const response = await axios.get(`${baseURL}/lines`); // Use master endpoint
      setLines(response.data);
      console.log("Lines API Response:", response.data);

    } catch (error) {
      console.error("Error fetching lines:", error);
    } finally {
      setLineLoading(false);
    }
  };

  // Add new line
  const handleAddLine = async () => {
    if (!newLineName.trim()) {
      alert("Please enter a line name");
      return;
    }

    try {
      setLineLoading(true);
      await axios.post(`${baseURL}/lines`, { lineName: newLineName });
      setNewLineName("");
      setShowAddLineForm(false);
      fetchLines();
      fetchUserShifts();
      alert("Line added successfully");
    } catch (error) {
      console.error("Error adding line:", error);
      alert("Error adding line");
    } finally {
      setLineLoading(false);
    }
  };

  // Update line - Fixed version
// Update Line
const handleUpdateLine = async (oldLineName, newLineName) => {
  if (!newLineName || newLineName.trim() === "") {
    alert("Please enter a new line name.");
    return;
  }

  try {
    console.log(`Updating line: ${oldLineName} => ${newLineName}`);
    await axios.put(`https://192.168.2.54:443/api/lines/${oldLineName}`, {
      newLineName: newLineName
    });
    alert(`Line updated from "${oldLineName}" to "${newLineName}".`);
    fetchLines(); // Refresh list
  } catch (error) {
    console.error("Error updating line:", error);
    alert("Failed to update line.");
  }
};

// Delete Line
const handleDeleteLine = async (lineName) => {
  if (window.confirm(`Are you sure you want to delete line "${lineName}"?`)) {
    try {
      setLineLoading(true);
      await axios.delete(`${baseURL}/lines/${lineName}`);
      fetchLines();
      fetchUserShifts();
      alert("Line deleted successfully");
    } catch (error) {
      console.error("Error deleting line:", error);
      alert("Error deleting line. It may be in use.");
    } finally {
      setLineLoading(false);
    }
  }
};

  // Handle start editing
  const handleStartEdit = (line) => {
    setEditingLine(line.LineID || line.id);
    setEditingLineName(line.LineName || line.lineName || line.LINE);
  };

  // Handle cancel editing
  const handleCancelEdit = () => {
    setEditingLine(null);
    setEditingLineName("");
  };

  useEffect(() => {
    fetchUserShifts();
  }, [fetchUserShifts]);

  const handleSearchUser = (e) => {
    setSearchUserShift(e.target.value);
    setCurrentPage(1);
  };

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const getSortedData = (data) => {
    if (!sortConfig.key) {
      return data;
    }
    return data.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) {
        return sortConfig.direction === "asc" ? -1 : 1;
      }
      if (a[sortConfig.key] > b[sortConfig.key]) {
        return sortConfig.direction === "asc" ? 1 : -1;
      }
      return 0;
    });
  };

  const handleFromDateChange = (e) => {
    setSelectedFromDate(e.target.value);
    setCurrentPage(1);
  };

  const handleToDateChange = (e) => {
    setSelectedToDate(e.target.value);
    setCurrentPage(1);
  };

  const getFilteredData = () => {
    return userShifts.filter((shift) => {
      const shiftDate = moment(shift.Shift_date_from, "YYYY-MM-DD");
      const fromDate = moment(selectedFromDate, "YYYY-MM-DD");
      const toDate = moment(selectedToDate, "YYYY-MM-DD");

      const withinDateRange =
        (!selectedFromDate || shiftDate.isSameOrAfter(fromDate, "day")) &&
        (!selectedToDate || shiftDate.isSameOrBefore(toDate, "day"));

      const shiftIdMatch =
        selectedShiftIds.length === 0 || selectedShiftIds.includes(shift.SHIFT_ID);
      
      const stageMatch =
        selectedStages.length === 0 || selectedStages.includes(shift.Stage_name);
      
      const lineMatch =
        selectedLines.length === 0 || selectedLines.includes(shift.LINE);

      const searchMatch =
        searchUserShift === "" ||
        Object.values(shift).some((value) =>
          (value || "")
            .toString()
            .toLowerCase()
            .includes(searchUserShift.toLowerCase())
        );

      return withinDateRange && shiftIdMatch && stageMatch && lineMatch && searchMatch;
    });
  };

  useEffect(() => {
    const results = getFilteredData();
    setFilteredUserShifts(results);
    if (results.length === 0 && userShifts.length > 0) {
      setNotification("No records found matching the selected filters");
    } else {
      setNotification("");
    }
  }, [
    userShifts,
    selectedShiftIds,
    selectedStages,
    selectedLines,
    selectedFromDate,
    selectedToDate,
    searchUserShift
  ]);

  const handleShowData = () => {
    const results = getFilteredData();
    setFilteredUserShifts(results);
    if (results.length === 0) {
      setNotification("No records found matching the selected filters");
    } else {
      setNotification(`Found ${results.length} records`);
    }
  };

  const sortedUserShifts = getSortedData(filteredUserShifts);
  const paginatedUserShifts = sortedUserShifts.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const SortIcon = ({ columnKey }) => {
    if (sortConfig.key === columnKey) {
      return (
        <FaSort
          className={
            sortConfig.direction === "asc" ? "rotate-up" : "rotate-down"
          }
        />
      );
    }
    return <FaSort />;
  };

  const handleNextPage = () => {
    if (currentPage * pageSize < sortedUserShifts.length) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const formatDate = (date) => {
    return moment(date).format("DD-MM-YYYY");
  };

  const handleShiftIdChange = (e) => {
    const value = e.target.value;
    setSelectedShiftIds((prev) =>
      e.target.checked ? [...prev, value] : prev.filter((id) => id !== value)
    );
  };

  const handleStageChange = (e) => {
    const value = e.target.value;
    setSelectedStages((prev) =>
      e.target.checked
        ? [...prev, value]
        : prev.filter((stage) => stage !== value)
    );
  };

  const handleLineChange = (e) => {
    const value = e.target.value;
    setSelectedLines((prev) =>
      e.target.checked
        ? [...prev, value]
        : prev.filter((line) => line !== value)
    );
  };

  const toggleSearchBar = () => {
    setShowSearchBar(!showSearchBar);
  };

  const handleDownload = () => {
    const dataToExport = filteredUserShifts;
    
    const formattedData = dataToExport.map((shift) => ({
      "User ID": shift.userid || "",
      "User Name": shift.user_name || "",
      "SHIFT ID": shift.SHIFT_ID || "",
      "Stage Name": shift.Stage_name || "",
      "Shift Date From": formatDate(shift.Shift_date_from) || "",
      "Shift Date To": formatDate(shift.Shift_date_to) || "",
      Line: shift.LINE || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(formattedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "UserShifts");

    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array",
    });
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8",
    });
    FileSaver.saveAs(blob, `UserShifts_Filtered_${moment().format('YYYY-MM-DD')}.xlsx`);
  };

const uniqueShiftIds = [
  ...new Set(userShifts.map((shift) => shift.SHIFT_ID)),
].sort();

const uniqueStages = [
  ...new Set(userShifts.map((shift) => shift.Stage_name)),
].sort();

const uniqueLines = [
  ...new Set(userShifts.map((shift) => shift.LINE).filter(line => line)),
].sort();


  const highlightText = (text, highlight) => {
    if (!highlight.trim()) {
      return text;
    }
    const regex = new RegExp(`(${highlight})`, "gi");
    return text.split(regex).map((part, index) =>
      part.toLowerCase() === highlight.toLowerCase() ? (
        <span key={index} className="highlight">
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  // Handle opening line management modal
  const handleEditLines = () => {
    setShowLineModal(true);
    fetchLines();
  };

  // Handle closing line management modal
  const handleCloseLineModal = () => {
    setShowLineModal(false);
    setEditingLine(null);
    setEditingLineName("");
    setShowAddLineForm(false);
    setNewLineName("");
  };

  return (
    <Container fluid>
      <Row className="mt-4">
        <Col md={12}>
          <div className="d-flex flex-wrap justify-content-between align-items-center mb-3">
            <h2 className="mb-4">User Shift Details</h2>
            <div className="d-flex flex-wrap">
              <div className="d-flex justify-content-end mb-3">
                <IconButton onClick={toggleSearchBar}>
                  <SearchIcon />
                </IconButton>

                {showSearchBar && (
                  <InputGroup
                    className="input-group"
                    style={{ width: "600px" }}
                  >
                    <FormControl
                      placeholder="Search for User Shift details"
                      value={searchUserShift}
                      onChange={handleSearchUser}
                      className="search-bar"
                    />
                  </InputGroup>
                )}
              </div>
              <Form.Group className="mb-3 mr-2 custom-date">
                <Form.Control
                  type="date"
                  value={selectedFromDate}
                  onChange={handleFromDateChange}
                  placeholder="From Date"
                />
              </Form.Group>
              <Form.Group className="mb-3 mr-2 custom-date">
                <Form.Control
                  type="date"
                  value={selectedToDate}
                  onChange={handleToDateChange}
                  placeholder="To Date"
                />
              </Form.Group>
              <Button
                variant="primary"
                onClick={handleShowData}
                className="custom-btn"
              >
                Show
              </Button>
            </div>
          </div>
          {notification && <Alert variant="warning">{notification}</Alert>}

          <Row>
            <Col md={4} className="mb-3">
              <h5>Filter by SHIFT ID</h5>
              <div className="filter-container">
                {loading ? (
                  <Spinner animation="border" />
                ) : (
                  uniqueShiftIds.map((id) => (
                    <Form.Check
                      key={id}
                      type="checkbox"
                      label={id}
                      value={id}
                      checked={selectedShiftIds.includes(id)}
                      onChange={handleShiftIdChange}
                      className="filter-check"
                    />
                  ))
                )}
              </div>
            </Col>
            <Col md={4} className="mb-3">
              <h5>Filter by Stage</h5>
              <div className="filter-container">
                {loading ? (
                  <Spinner animation="border" />
                ) : (
                  uniqueStages.map((stage) => (
                    <Form.Check
                      key={stage}
                      type="checkbox"
                      label={stage}
                      value={stage}
                      checked={selectedStages.includes(stage)}
                      onChange={handleStageChange}
                      className="filter-check"
                    />
                  ))
                )}
              </div>
            </Col>
            <Col md={4} className="mb-3">
              <h5>Filter by Line</h5>
              <div className="filter-container">
                {loading ? (
                  <Spinner animation="border" />
                ) : (
                  uniqueLines.map((line) => (
                    <Form.Check
                      key={line}
                      type="checkbox"
                      label={line}
                      value={line}
                      checked={selectedLines.includes(line)}
                      onChange={handleLineChange}
                      className="filter-check"
                    />
                  ))
                )}
              </div>
            </Col>
          </Row>

          <div className="d-flex justify-content-between align-items-center mb-3">
            <div>
              <strong>Total Records: {filteredUserShifts.length}</strong>
            </div>
            <div className="d-flex gap-2">
              <Button
                variant="secondary"
                onClick={handleEditLines}
                className="custom-btn"
              >
                <FaEdit /> Edit Lines
              </Button>
              <Button
                variant="success"
                onClick={handleDownload}
                className="custom-btn"
              >
                <FaDownload /> Download Filtered Data as Excel
              </Button>
            </div>
          </div>

          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th onClick={() => handleSort("userid")}>
                  User ID <SortIcon columnKey="userid" />
                </th>
                <th onClick={() => handleSort("user_name")}>
                  User Name <SortIcon columnKey="user_name" />
                </th>
                <th onClick={() => handleSort("SHIFT_ID")}>
                  SHIFT ID <SortIcon columnKey="SHIFT_ID" />
                </th>
                <th onClick={() => handleSort("Stage_name")}>
                  Stage Name <SortIcon columnKey="Stage_name" />
                </th>
                <th onClick={() => handleSort("Shift_date_from")}>
                  Shift Date <SortIcon columnKey="Shift_date_from" />
                </th>
                <th onClick={() => handleSort("LINE")}>
                  Line <SortIcon columnKey="LINE" />
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedUserShifts.map((shift, index) => (
                <tr key={index}>
                  <td>
                    {highlightText(shift.userid || "", searchUserShift)}
                  </td>
                  <td>
                    {highlightText(shift.user_name || "", searchUserShift)}
                  </td>
                  <td>
                    {highlightText(shift.SHIFT_ID || "", searchUserShift)}
                  </td>
                  <td>
                    {highlightText(shift.Stage_name || "", searchUserShift)}
                  </td>
                  <td>
                    {highlightText(
                      formatDate(shift.Shift_date_from) || "",
                      searchUserShift
                    )}
                  </td>
                  <td>{highlightText(shift.LINE || "", searchUserShift)}</td>
                </tr>
              ))}
            </tbody>
          </Table>

          <div className="d-flex justify-content-between table-controls">
            <Button
              variant="primary"
              onClick={handlePrevPage}
              disabled={currentPage === 1}
            >
              Prev
            </Button>
            <span>
              Page {currentPage} of {Math.ceil(sortedUserShifts.length / pageSize)}
            </span>
            <Button
              variant="primary"
              onClick={handleNextPage}
              disabled={currentPage * pageSize >= sortedUserShifts.length}
            >
              Next
            </Button>
          </div>
        </Col>
      </Row>

      {/* Fixed Line Management Modal */}
      {/* Line Management Modal */}
<Modal show={showLineModal} onHide={handleCloseLineModal} size="lg">
  <Modal.Header closeButton>
    <Modal.Title>Manage Lines</Modal.Title>
  </Modal.Header>
  <Modal.Body>
    <div className="d-flex justify-content-between align-items-center mb-3">
      <h5>All Lines</h5>
      {/* <Button
        variant="success"
        onClick={() => setShowAddLineForm(!showAddLineForm)}
      >
        <FaPlus /> Add New Line
      </Button> */}
    </div>

    {/* Add New Line Form */}
    {showAddLineForm && (
      <Card className="mb-3">
        <Card.Body>
          <h6>Add New Line</h6>
          <InputGroup className="mb-2">
            <FormControl
              placeholder="Enter line name"
              value={newLineName}
              onChange={(e) => setNewLineName(e.target.value)}
            />
            <Button
              variant="primary"
              onClick={handleAddLine}
              disabled={lineLoading}
            >
              {lineLoading ? <Spinner size="sm" animation="border" /> : "Add"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setShowAddLineForm(false);
                setNewLineName("");
              }}
            >
              Cancel
            </Button>
          </InputGroup>
        </Card.Body>
      </Card>
    )}

    {/* Lines Table */}
    {lineLoading ? (
      <div className="text-center">
        <Spinner animation="border" />
      </div>
    ) : (
      <Table striped bordered hover>
        <thead>
          <tr>
            <th>S.NO</th>
            <th>Line Name</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((line, index) => {
            const lineName = line.LineName || line.lineName || line.LINE;

            return (
              <tr key={lineName}>
                {/* Serial Number */}
                <td>{index + 1}</td>

                {/* Editable Line Name */}
                <td>
                  {editingLine === lineName ? (
                    <FormControl
                      type="text"
                      value={editingLineName}
                      onChange={(e) => setEditingLineName(e.target.value)}
                    />
                  ) : (
                    lineName
                  )}
                </td>

                {/* Action Buttons */}
                <td>
                  {editingLine === lineName ? (
                    <>
                      <Button
                        variant="success"
                        size="sm"
                        className="me-2"
                        onClick={() => handleUpdateLine(lineName, editingLineName)}
                        disabled={lineLoading}
                      >
                        Save
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleCancelEdit}
                      >
                        Cancel
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="warning"
                        size="sm"
                        className="me-2"
                        onClick={() => {
                          setEditingLine(lineName);
                          setEditingLineName(lineName);
                        }}
                      >
                        <FaEdit /> Edit
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDeleteLine(lineName)}
                        disabled={lineLoading}
                      >
                        <FaTrash /> Delete
                      </Button>
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </Table>
    )}
  </Modal.Body>
  <Modal.Footer>
    <Button variant="secondary" onClick={handleCloseLineModal}>
      Close
    </Button>
  </Modal.Footer>
</Modal>

    </Container>
  );
};

export default UserShiftReport;
