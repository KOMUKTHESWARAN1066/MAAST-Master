import React, { useState, useEffect, useCallback } from "react";
import { Form, Container, Row, Col, Table, Button, Spinner} from "react-bootstrap";
import axios from "axios";
import { DateTime } from "luxon";
import * as XLSX from "xlsx";
import { FaDownload } from "react-icons/fa";
import "bootstrap/dist/css/bootstrap.min.css";
import "../styles/Attendance.css";
import {
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid, 
  LabelList,
  Cell
} from "recharts";

const Attendance = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedShifts, setSelectedShifts] = useState([]);
  const [selectedLines, setSelectedLines] = useState([]);
  const [shiftOptions, setShiftOptions] = useState([]);
  const [lineOptions, setLineOptions] = useState([]);
  const [attendanceDetails, setAttendanceDetails] = useState([]);
  const [detailedRecords, setDetailedRecords] = useState([]);
  const [detailType, setDetailType] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [showTable, setShowTable] = useState(false);
  const [showAllDetails, setShowAllDetails] = useState(false);
  const [loadingShifts, setLoadingShifts] = useState(false);
  const [loadingLines, setLoadingLines] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [swapPopup, setSwapPopup] = useState(false);
  const [swapEmployees, setSwapEmployees] = useState([]);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showGraph, setShowGraph] = useState(false);

  // Safe trim helper function
  const safeTrim = (value) => {
    return value && typeof value === 'string' ? value.trim() : value;
  };

  useEffect(() => {
    const fetchOptions = async () => {
      setLoadingShifts(true);
      setLoadingLines(true);
      try {
        const shiftResponse = await axios.get(
          "https://192.168.2.54:443/api/shifts"
        );
        const lineResponse = await axios.get(
          "https://192.168.2.54:443/api/lines"
        );
        setShiftOptions(shiftResponse.data || []);
        console.log(shiftResponse.data)
        setLineOptions(lineResponse.data || []);
      } catch (error) {
        console.error("Error fetching options:", error);
        setShiftOptions([]);
        setLineOptions([]);
      } finally {
        setLoadingShifts(false);
        setLoadingLines(false);
      }
    };
    fetchOptions();
  }, []);

  const fetchAttendanceDetails = useCallback(async () => {
    if (selectedShifts.length === 0 || selectedLines.length === 0) {
      return;
    }
    
    const formattedDate = formatDate(selectedDate);
    setLoadingDetails(true);
    try {
      const response = await axios.get(
        "https://192.168.2.54:443/api/attendance",
        {
          params: {
            date: formattedDate,
            shifts: selectedShifts.join(","),
            lines: selectedLines.join(","),
          },
        }
      );
      setAttendanceDetails(response.data || []);
      console.log(response.data);
      setShowTable(true);
    } catch (error) {
      console.error("Error fetching attendance details:", error);
      setAttendanceDetails([]);
    } finally {
      setLoadingDetails(false);
    }
  }, [selectedDate, selectedShifts, selectedLines]);

  const fetchDetailedRecords = async (type, shiftId, stageName, line) => {
    console.log("Fetching details for:", { type, shiftId, stageName, line });
    const formattedDate = formatDate(selectedDate);
    setLoadingRecords(true);
    setDetailType(type);

    try {
      if (!shiftId && !stageName && !line && (type === "present" || type === "absent")) {
        // TOTAL BUTTON click — filter client-side from showAll
        const response = await axios.get(
          "https://192.168.2.54:443/api/attendance/showAll",
          {
            params: {
              date: formattedDate,
              shifts: selectedShifts.join(","),
              lines: selectedLines.join(","),
            },
          }
        );
        console.log("Total button response:", response.data);
        
        const responseData = response.data || [];
        
        // Enhanced filtering with debug logs
        const filtered = responseData.filter((record) => {
          if (!record) return false;
          
          const status = record.STATUS ? String(record.STATUS).toLowerCase().trim() : "";
          console.log("Record status:", record.STATUS, "Normalized:", status, "Looking for:", type);
          
          if (type === "present") {
            return status === "present";
          } else if (type === "absent") {
            return status === "absent";
          }
          return false;
        });

        console.log(`Total records: ${responseData.length}, Filtered ${type} records: ${filtered.length}`);
        setDetailedRecords(filtered);
        setShowAllDetails(false);
        
      } else {
        // STAGE-WISE row click — filter from showAll data
        const response = await axios.get(
          "https://192.168.2.54:443/api/attendance/showAll",
          {
            params: {
              date: formattedDate,
              shifts: selectedShifts.join(","),
              lines: selectedLines.join(","),
            },
          }
        );

        const responseData = response.data || [];
        
        // Enhanced filtering with debug logs
        const filtered = responseData.filter((record) => {
          if (!record) return false;
          
          const matchesShift = safeTrim(String(record.SHIFT_ID || "")) === safeTrim(String(shiftId || ""));
          const matchesStage = safeTrim(String(record.Stage_name || "")) === safeTrim(String(stageName || ""));
          const matchesLine = safeTrim(String(record.LINE || "")) === safeTrim(String(line || ""));
          
          // Enhanced status matching
          const recordStatus = record.STATUS ? String(record.STATUS).toLowerCase().trim() : "";
          let matchesType = false;
          
          if (type === "present") {
            matchesType = recordStatus === "present";
          } else if (type === "absent") {
            matchesType = recordStatus === "absent";
          } else if (type === "allot") {
            matchesType = true; // For allot, show all records regardless of status
          }
          
          const result = matchesShift && matchesStage && matchesLine && matchesType;
          
          // Debug logging
          console.log("Filtering record:", {
            USERID: record.USERID,
            status: recordStatus,
            matchesShift,
            matchesStage, 
            matchesLine,
            matchesType,
            finalResult: result
          });
          
          return result;
        });

        console.log(`Stage-wise filtered records for ${type}:`, filtered.length);
        setDetailedRecords(filtered);
        setShowAllDetails(false);
      }
    } catch (error) {
      console.error(`Error fetching ${type} records:`, error);
      setDetailedRecords([]);
    } finally {
      setLoadingRecords(false);
    }
  };

  const handleCheckboxChange = (event, setSelectedItems, selectedItems) => {
    const value = event.target.value;
    if (event.target.checked) {
      setSelectedItems([...selectedItems, value]);
    } else {
      setSelectedItems(selectedItems.filter((item) => item !== value));
    }
  };

  const handleLineChange = (event) => {
    const { value, checked } = event.target;
    if (checked) {
      setSelectedLines([...selectedLines, value]);
    } else {
      setSelectedLines(selectedLines.filter((line) => line !== value));
    }
  };

  const formatDate = (date) => {
    return DateTime.fromJSDate(date).toFormat("yyyy-MM-dd");
  };

  const parseDate = (dateString) => {
    const date = DateTime.fromFormat(dateString, "yyyy-MM-dd").toJSDate();
    return isNaN(date.getTime()) ? new Date() : date;
  };

  const handleDateChange = (e) => {
    const newDate = parseDate(e.target.value);
    setSelectedDate(newDate);
  };

  const handleButtonClick = () => {
    handleShowRecords();
    setShowGraph((prev) => !prev);
  };

  const handleShowRecords = () => {
    if (selectedShifts.length > 0 && selectedLines.length > 0) {
      setShowTable(true);
      setShowAllDetails(false);
      fetchAttendanceDetails();
    } else {
      alert("Please select at least one shift and one line.");
    }
  };

  const handleShowAll = async () => {
    if (selectedShifts.length === 0 || selectedLines.length === 0) {
      alert("Please select at least one shift and one line.");
      return;
    }

    const formattedDate = formatDate(selectedDate);
    setLoadingRecords(true);
    setShowTable(true);
    setShowAllDetails(true);
    setDetailType("showAll");
    
    try {
      const response = await axios.get(
        "https://192.168.2.54:443/api/attendance/showAll",
        {
          params: {
            date: formattedDate,
            shifts: selectedShifts.join(","),
            lines: selectedLines.join(","),
          },
        }
      );
      
      setDetailedRecords(response.data || []);
      console.log("showall",response.data)
    } catch (error) {
      console.error("Error fetching all records:", error);
      setDetailedRecords([]);
    } finally {
      setLoadingRecords(false);
    }
  };

  const calculateTotals = () => {
    if (!Array.isArray(attendanceDetails)) {
      return { allot: 0, present: 0, absent: 0 };
    }
    
    const totals = attendanceDetails.reduce(
      (acc, detail) => {
        if (detail) {
          acc.allot += detail.ALLOT || 0;
          acc.present += detail.PRESENT || 0;
          acc.absent += detail.ABSENT || 0;
        }
        return acc;
      },
      { allot: 0, present: 0, absent: 0 }
    );
    return totals;
  };

  const totals = calculateTotals();

  const downloadExcel = () => {
    if (!Array.isArray(attendanceDetails)) return;
    
    const data = attendanceDetails.map((record) => ({
      "Stage Name": record?.Stage_name || "N/A",
      "Shift ID": record?.SHIFT_ID || "N/A",
      Line: record?.LINE || "N/A",
      "Shift Start Time": record?.SFTSTTime || "N/A",
      Allot: record?.ALLOT || 0,
      Present: record?.PRESENT || 0,
      Absent: record?.ABSENT || 0,
      "First Punch In": record?.FirstPunchIn ? 
        DateTime.fromISO(record.FirstPunchIn).toFormat("dd-MM-yyyy HH:mm:ss") : "No Punch",
      "Punctuality Status": record?.PunctualityStatus || "N/A"
    }));

    const totals = calculateTotals();
    const totalRow = {
      "Stage Name": "Totals",
      "Shift ID": "",
      Line: "",
      "Shift Start Time": "",
      Allot: totals.allot,
      Present: totals.present,
      Absent: totals.absent,
      "First Punch In": "",
      "Punctuality Status": ""
    };

    data.push(totalRow);

    const worksheet = XLSX.utils.json_to_sheet(data);
    worksheet["!cols"] = [
      { wpx: 150 }, { wpx: 100 }, { wpx: 100 }, { wpx: 120 },
      { wpx: 100 }, { wpx: 100 }, { wpx: 100 }, { wpx: 180 }, { wpx: 120 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance Details");

    XLSX.writeFile(
      workbook,
      `Attendance_Details_${formatDate(selectedDate)}.xlsx`
    );
  };

  const downloadAll = () => {
    if (!Array.isArray(detailedRecords)) return;
    
    const data = detailedRecords.map((record) => ({
      "User ID": record?.USERID || "N/A",
      "User Name": record?.NAME || "N/A",
      "Stage Name": record?.Stage_name || "N/A",
      "Shift ID": record?.SHIFT_ID || "N/A",
      Line: record?.LINE || "N/A",
      Status: record?.STATUS || "N/A",
      "Punch Time": record?.PUNCHIN ? 
        DateTime.fromISO(record.PUNCHIN).toFormat("dd-MM-yyyy HH:mm:ss") : "No Punch",
      "Shift Start Time": record?.SFTSTTime || "N/A",
      "Punctuality Status": record?.PunctualityStatus || "N/A",
      "Swap User": record?.SWAPUSERNAME || "No Swap"
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    worksheet["!cols"] = [
      { wpx: 100 }, { wpx: 150 }, { wpx: 150 }, 
      { wpx: 100 }, { wpx: 100 }, { wpx: 100 }, 
      { wpx: 180 }, { wpx: 120 }, { wpx: 120 }, { wpx: 120 }
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "All Details");

    XLSX.writeFile(
      workbook,
      `Attendance_Details_${formatDate(selectedDate)}.xlsx`
    );
  };

  const handleSaveAllSwaps = () => {
    if (!Array.isArray(detailedRecords)) return;
    
    const recordsToSwap = detailedRecords.filter(
      (record) => record && record.swapEmployee
    );

    if (recordsToSwap.length === 0) {
      alert("No records selected for swapping.");
      return;
    }

    const swaps = recordsToSwap.map((record) => ({
      shiftDate: formatDate(selectedDate),
      Stage_name: record?.Stage_name || "",
      shiftId: record?.SHIFT_ID || "",
      line: record?.LINE || "",
      originalUserId: record?.USERID || "",
      absentUserId: record?.USERID || "",
      swapUserId: record.swapEmployee ? record.swapEmployee.split(" ")[0] : "",
      originalUserStatus: record?.STATUS || detailType
    }));

    axios
      .post("https://192.168.2.54:443/api/saveUserSwap", swaps)
      .then((response) => {
        alert("Swaps saved successfully");
        fetchAttendanceDetails();
        setDetailedRecords((prevRecords) =>
          prevRecords.map((record) => ({
            ...record,
            swapEmployee: "",
          }))
        );
      })
      .catch((error) => console.error(error));
  };

  useEffect(() => {
    const formattedDate = formatDate(selectedDate);
    if (swapPopup && selectedRecord) {
      axios
        .get("https://192.168.2.54:443/api/getEmployees", {
          params: {
            date: formattedDate,
            shiftId: selectedRecord.SHIFT_ID,
            Stage_name: selectedRecord.Stage_name,
            Line: selectedRecord.LINE,
          },
        })
        .then((response) => {
          setSwapEmployees(response.data || []);
        })
        .catch((error) => {
          console.error("Error fetching the employee list:", error);
          setSwapEmployees([]);
        });
    }
  }, [swapPopup, selectedRecord, selectedDate]);

  const handleShowEmployees = (USERID, NAME, SHIFT_ID, Stage_name, LINE) => {
    setSelectedRecord({ USERID, NAME, SHIFT_ID, Stage_name, LINE });
    setSwapPopup(true);
  };

  const filteredEmployees = Array.isArray(swapEmployees) ? swapEmployees.filter((swapdetail) => {
    if (!swapdetail) return false;
    const query = searchQuery.toLowerCase();
    return (
      (swapdetail.USERID && swapdetail.USERID.toLowerCase().includes(query)) ||
      (swapdetail.NAME && swapdetail.NAME.toLowerCase().includes(query)) ||
      (swapdetail.Stage_name &&
        swapdetail.Stage_name.toLowerCase().includes(query)) ||
      (swapdetail.SKILL_DESCRIPTION &&
        swapdetail.SKILL_DESCRIPTION.toLowerCase().includes(query))
    );
  }) : [];

  const handleClosePopup = () => {
    setSwapPopup(false);
  };

  function handleEmployeeSelect(swapdetail) {
    if (swapdetail && swapdetail.USERID) {
      setSelectedEmployee(swapdetail.USERID);
    } else {
      console.error("Invalid employee details:", swapdetail);
    }
  }

  const handlesubmit = () => {
    if (selectedEmployee) {
      const updatedRecord = {
        ...selectedRecord,
        swapEmployee: selectedEmployee,
      };

      const updatedRecords = detailedRecords.map((record) =>
        record && record.USERID === selectedRecord.USERID &&
        record.SHIFT_ID === selectedRecord.SHIFT_ID
          ? updatedRecord
          : record
      );

      setDetailedRecords(updatedRecords);
      console.log("attdetails", attendanceDetails);
      setSelectedEmployee("");
      setSwapPopup(false);
    } else {
      alert("Please select an employee before submitting.");
    }
  };

  const formatPunchTime = (punchDate) => {
    if (!punchDate) return "No Punch";
    try {
      return DateTime.fromISO(punchDate).toFormat("dd-MM-yyyy HH:mm:ss");
    } catch (error) {
      return "Invalid Date";
    }
  };

  const getPunctualityColor = (status) => {
    switch (status) {
      case "On Time":
        return "green";
      case "Late":
        return "red";
      case "No Punch":
        return "orange";
      default:
        return "black";
    }
  };

  return (
    <>
      <Container fluid>
        {swapPopup && (
          <div className="popup-overlay">
            <div className="popup-content">
              <input
                type="text"
                placeholder="Search by User ID, Name, Stage Name, or Skill"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              <Table striped bordered hover responsive>
                <thead>
                  <tr>
                    <th>Select</th>
                    <th>User ID</th>
                    <th>Name</th>
                    <th>Stage Name</th>
                    <th>Line</th>
                    <th>Skill</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEmployees.map((swapdetail, index) => (
                    <tr key={index}>
                      <td>
                        <input
                          type="checkbox"
                          value={swapdetail?.USERID || ""}
                          checked={selectedEmployee === swapdetail?.USERID}
                          onChange={() => handleEmployeeSelect(swapdetail)}
                        />
                      </td>
                      <td>{swapdetail?.USERID || "N/A"}</td>
                      <td>{swapdetail?.NAME || "N/A"}</td>
                      <td>{swapdetail?.Stage_name || "N/A"}</td>
                      <td>{swapdetail?.LINE || "N/A"}</td>
                      <td>{swapdetail?.SKILL_DESCRIPTION || "N/A"}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
              <button className="submit-button" onClick={handlesubmit}>
                Submit
              </button>
              <button className="close-button" onClick={handleClosePopup}>
                Close
              </button>
            </div>
          </div>
        )}
        
        <Row className="mt-4">
          <h1>Attendance Management</h1>
          <div className="d-flex justify-content-end mb-3">
            <Form.Control
              type="date"
              value={formatDate(selectedDate)}
              onChange={handleDateChange}
              style={{ width: "auto", marginRight: "10px", fontSize: "15px" }}
            />
          </div>

          <Row>
            <Col md={6} className="mb-3">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h3>Select Shifts</h3>
              </div>
              <div
                style={{
                  maxHeight: "200px",
                  overflowY: "auto",
                  border: "1px solid #ced4da",
                  padding: "10px",
                  fontSize: "15px",
                }}
              >
                {loadingShifts ? (
                  <Spinner animation="border" variant="primary" />
                ) : (
                  Array.isArray(shiftOptions) && shiftOptions.map((shift, index) => (
                    shift && (
                      <Form.Check
                        key={index}
                        type="checkbox"
                        label={shift.SHIFT_ID || "N/A"}
                        value={shift.SHIFT_ID || ""}
                        onChange={(e) =>
                          handleCheckboxChange(
                            e,
                            setSelectedShifts,
                            selectedShifts
                          )
                        }
                      />
                    )
                  ))
                )}
              </div>
            </Col>

            <Col md={6} className="mb-3">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h3>Select Lines</h3>
                <Button
                  onClick={handleButtonClick}
                  style={{ fontSize: "14px" }}
                >
                  Show Records
                </Button>
              </div>
              <div
                style={{
                  maxHeight: "200px",
                  overflowY: "auto",
                  border: "1px solid #ced4da",
                  padding: "10px",
                  fontSize: "15px",
                }}
              >
                {loadingLines ? (
                  <Spinner animation="border" variant="primary" />
                ) : (
                  Array.isArray(lineOptions) && lineOptions.map((line, index) => (
                    line && line.LINE && (
                      <div key={index} style={{ marginBottom: "8px" }}>
                        <input
                          type="checkbox"
                          value={safeTrim(line.LINE) || ""}
                          onChange={handleLineChange}
                          style={{ marginRight: "5px" }}
                        />
                        <label>{safeTrim(line.LINE) || "N/A"}</label>
                      </div>
                    )
                  ))
                )}
              </div>
            </Col>
          </Row>
          
          {showTable && (
            <Row>
              <Col md={6} className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h2>Attendance Details</h2>
                  <Button
                    onClick={handleShowAll}
                    style={{ marginLeft: "10px", fontSize: "14px" }}
                  >
                    Show All
                  </Button>
                  &nbsp;
                  <Button variant="success" onClick={downloadExcel}>
                    <FaDownload /> Attendance Details
                  </Button>
                </div>

                <div className="totals-summary d-flex justify-content-start align-items-center gap-3 mb-3">
                  <label style={{ minWidth: "150px", fontWeight: "bold" }}>
                    Total Allot: {calculateTotals().allot}
                  </label>
                  <Button
                    variant="success"
                    onClick={() => fetchDetailedRecords("present", "", "", "")}
                    style={{ minWidth: "150px", fontWeight: "bold" }}
                    disabled={loadingRecords && detailType === "present"}
                  >
                    {loadingRecords && detailType === "present" ? (
                      <Spinner animation="border" size="sm" />
                    ) : (
                      `Total Present: ${calculateTotals().present}`
                    )}
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => fetchDetailedRecords("absent", "", "", "")}
                    style={{ minWidth: "150px", fontWeight: "bold" }}
                    disabled={loadingRecords && detailType === "absent"}
                  >
                    {loadingRecords && detailType === "absent" ? (
                      <Spinner animation="border" size="sm" />
                    ) : (
                      `Total Absent: ${calculateTotals().absent}`
                    )}
                  </Button>
                </div>

                <div className="scrollable-table">
                  {loadingDetails ? (
                    <Spinner animation="border" />
                  ) : (
                    <Table striped bordered hover responsive>
                      <thead style={{ fontSize: "15px" }}>
                        <tr>
                          <th>S.No</th>
                          <th>Stage Name</th>
                          <th>Shift ID</th>
                          <th>Line</th>
                          <th>Start Time</th>
                          <th>Allot</th>
                          <th>Present</th>
                          <th>Absent</th>
                        </tr>
                      </thead>
                      <tbody style={{ fontSize: "15px" }}>
                        {Array.isArray(attendanceDetails) && attendanceDetails.map((detail, index) => (
                          detail && (
                            <tr key={index}>
                              <td>{index + 1}</td>
                              <td>{detail.Stage_name || "N/A"}</td>
                              <td>{detail.SHIFT_ID || "N/A"}</td>
                              <td>{detail.LINE || "N/A"}</td>
                              <td>{detail.SFTSTTime || "N/A"}</td>
                              <td>
                                <button
                                  className="animated-button"
                                  onClick={() =>
                                    fetchDetailedRecords(
                                      "allot",
                                      detail.SHIFT_ID,
                                      detail.Stage_name,
                                      detail.LINE
                                    )
                                  }
                                  disabled={loadingRecords && detailType === "allot"}
                                >
                                  {loadingRecords && detailType === "allot" ? (
                                    <Spinner animation="border" size="sm" />
                                  ) : (
                                    detail.ALLOT || 0
                                  )}
                                </button>
                              </td>
                              <td>
                                <button
                                  className="animated-button present"
                                  onClick={() =>
                                    fetchDetailedRecords(
                                      "present",
                                      detail.SHIFT_ID,
                                      detail.Stage_name,
                                      detail.LINE
                                    )
                                  }
                                  disabled={loadingRecords && detailType === "present"}
                                >
                                  {loadingRecords && detailType === "present" ? (
                                    <Spinner animation="border" size="sm" />
                                  ) : (
                                    detail.PRESENT || 0
                                  )}
                                </button>
                              </td>
                              <td>
                                <button
                                  className="animated-button absent"
                                  onClick={() =>
                                    fetchDetailedRecords(
                                      "absent",
                                      detail.SHIFT_ID,
                                      detail.Stage_name,
                                      detail.LINE
                                    )
                                  }
                                  disabled={loadingRecords && detailType === "absent"}
                                >
                                  {loadingRecords && detailType === "absent" ? (
                                    <Spinner animation="border" size="sm" />
                                  ) : (
                                    detail.ABSENT || 0
                                  )}
                                </button>
                              </td>
                            </tr>
                          )
                        ))}
                        <tr>
                          <td colSpan="3" style={{ fontWeight: "bold" }}>
                            Total
                          </td>
                          <td></td>
                          <td></td>
                          <td style={{ fontWeight: "bold" }}>
                            {calculateTotals().allot}
                          </td>
                          <td style={{ fontWeight: "bold" }}>
                            {calculateTotals().present}
                          </td>
                          <td style={{ fontWeight: "bold" }}>
                            {calculateTotals().absent}
                          </td>
                        </tr>
                      </tbody>
                    </Table>
                  )}
                </div>

                {/* GRAPH SECTION */}
                {showGraph &&
                  (totals.allot > 0 || totals.present > 0 || totals.absent > 0) && (
                    <div className="d-flex justify-content-center mt-4">
                      <div className="fixed-barchart">
                        <BarChart
                          width={500}
                          height={300}
                          data={[
                            { name: "allot", value: totals.allot },
                            { name: "present", value: totals.present },
                            { name: "absent", value: totals.absent },
                          ]}
                          margin={{ top: 40, right: 30, left: 20, bottom: 60 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="value">
                            <LabelList 
                              dataKey="value" 
                              position="top" 
                              style={{ fontSize: '14px', fontWeight: 'bold' }}
                            />
                            <Cell fill="#0d6efd" />
                            <Cell fill="#228B22" />
                            <Cell fill="#dc3545" />
                          </Bar>
                        </BarChart>
                      </div>
                    </div>
                  )}
              </Col>
              
              {(showAllDetails || detailType) && (
                <Col md={6} className="mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h2>
                      {detailType === "showAll"
                        ? "Show All Details"
                        : detailType
                        ? `${
                            detailType.charAt(0).toUpperCase() +
                            detailType.slice(1)
                          } Details`
                        : "Details"}
                    </h2>
                    <Button variant="success" onClick={downloadAll}>
                      <FaDownload /> Download All Details
                    </Button>
                  </div>
                  
                  {(detailType === "absent" || detailType === "present") && (
                    <div className="d-flex justify-content-end align-items-center mb-3">
                      <Button onClick={handleSaveAllSwaps}>
                        Save All Swaps
                      </Button>
                    </div>
                  )}

                  <div className="scrollable-table">
                    {loadingRecords ? (
                      <Spinner animation="border" />
                    ) : !Array.isArray(detailedRecords) || detailedRecords.length === 0 ? (
                      <div className="text-center p-3">
                        <p>No {detailType} records found for the selected criteria.</p>
                      </div>
                    ) : (
                      <Table striped bordered hover responsive>
                        <thead style={{ fontSize: "15px" }}>
                          <tr>
                            <th>S.No</th>
                            <th>User ID</th>
                            <th>Name</th>
                            <th>Stage Name</th>
                            <th>Shift ID</th>
                            {detailType === "present" && <th>Punch Time</th>}
                            {detailType === "present" && <th>Shift Start</th>}
                            {detailType === "present" && <th>Status</th>}
                            {detailType === "showAll" && <th>Line</th>}
                            {detailType === "showAll" && <th>Status</th>}
                            {detailType === "showAll" && <th>Punch Time</th>}
                            {(detailType === "absent" || detailType === "present") && <th>Line</th>}
                            {(detailType === "absent" || detailType === "present") && <th>Swap Action</th>}
                            {(detailType === "absent" || detailType === "present") && <th>Selected Swap</th>}
                            {(detailType === "absent" || detailType === "present") && <th>Swapped Employee</th>}
                          </tr>
                        </thead>
                        <tbody style={{ fontSize: "15px" }}>
                          {detailedRecords.map((record, index) => (
                            record && (
                              <tr key={index}>
                                <td>{index + 1}</td>
                                <td>{record.USERID || "N/A"}</td>
                                <td>{record.NAME || "N/A"}</td>
                                <td>{record.Stage_name || "N/A"}</td>
                                <td>{record.SHIFT_ID || "N/A"}</td>
                                
                                {detailType === "present" && (
                                  <>
                                    <td>{record.PUNCHIN}</td>
                                    <td>{record.StartTime || "N/A"}</td>
                                    <td style={{
                                      color: getPunctualityColor(record.PunctualityStatus),
                                      fontWeight: "bold"
                                    }}>
                                      {record.PunctualityStatus || "Unknown"}
                                    </td>
                                  </>
                                )}
                                
                                {detailType === "showAll" && (
                                  <>
                                    <td>{record.LINE || "N/A"}</td>
                                    <td style={{
                                      color: record.STATUS && record.STATUS.toLowerCase() === "absent" ? "red" : "green",
                                      fontWeight: "bold"
                                    }}>
                                      {record.STATUS || "N/A"}
                                    </td>
                                    <td>{record.PUNCHIN}</td>
                                  </>
                                )}
                                
                                {(detailType === "absent" || detailType === "present") && (
                                  <>
                                    <td>{record.LINE || "N/A"}</td>
                                    <td>
                                      <Button
                                        onClick={() =>
                                          handleShowEmployees(
                                            record.USERID,
                                            record.NAME,
                                            record.SHIFT_ID,
                                            record.Stage_name,
                                            record.LINE
                                          )
                                        }
                                        disabled={record.SWAPUSERNAME}
                                        variant="primary"
                                        size="sm"
                                      >
                                        Swap
                                      </Button>
                                    </td>
                                    <td>
                                      {record.swapEmployee || "No Swap Selected"}
                                    </td>
                                    <td>{record.SWAPUSERNAME || "No Swap"}</td>
                                  </>
                                )}
                              </tr>
                            )
                          ))}
                        </tbody>
                      </Table>
                    )}
                  </div>
                </Col>
              )}
            </Row>
          )}
        </Row>
      </Container>
    </>
  );
};

export default Attendance;
