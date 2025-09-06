// src/components/NPunchReport.jsx
import React, { useEffect, useState } from "react";
import {
  Container, Row, Col, Button, Form, Spinner, Alert, Table,
} from "react-bootstrap";
import axios from "axios";
import * as XLSX from "xlsx"; // SheetJS
import { Modal, ListGroup } from "react-bootstrap";

const API_BASE_URL = "https://192.168.2.54:443";
const EMPLOYEE_API_URL = "https://192.168.2.54:443/api/employees";

const NPunchReport = () => {
  const [fromDate, setFromDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [toDate, setToDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [employees, setEmployees] = useState([]);
  const [userid, setUserid] = useState("");
  const [name, setName] = useState("");
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [selectedPunches, setSelectedPunches] = useState(null);   // null = modal closed
  const [modalDate, setModalDate] = useState('');      // show which day we're viewing

  // Load employees once
  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await axios.get(EMPLOYEE_API_URL, { timeout: 15000 });
        setEmployees(Array.isArray(res.data) ? res.data : []);
      } catch {
        setErr("Failed to load employees");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const prettyDate = (d) => {
    if (!d) return "-";
    return new Date(d).toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });
  };

  const prettyDateShort = (d) => {
    if (!d) return "-";
    const date = new Date(d);
    if (isNaN(date.getTime())) return "-";
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // getMonth() returns 0-11
    const year = date.getFullYear();
    
    return `${day}-${month}-${year}`;
  };

  // For headline cells like "6AM", "2PM"
const fmtTimeShort = (dt) => {
  if (!dt) return "-";
  
  // Handle simple time strings like "08:15" directly
  if (typeof dt === 'string' && dt.match(/^\d{2}:\d{2}$/)) {
    const [hours, minutes] = dt.split(':');
    const hour = parseInt(hours, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return minutes === '00' ? `${displayHour}${ampm}` : `${displayHour}:${minutes}${ampm}`;
  }
  
  // Handle datetime strings/objects
  let date;
  if (typeof dt === 'string' && dt.includes('T')) {
    // For ISO datetime strings, parse without timezone conversion
    date = new Date(dt + (dt.endsWith('Z') ? '' : 'Z'));
  } else {
    date = new Date(dt);
  }
  
  if (isNaN(date.getTime())) return "-";
  
  // Use UTC methods to avoid timezone issues
  const hours = date.getUTCHours();
  const minutes = date.getUTCMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  
  return minutes === 0 ? `${displayHour}${ampm}` : `${displayHour}:${minutes.toString().padStart(2, '0')}${ampm}`;
};


  // For detail cells like "11:32 AM"
  const fmtTime = (dt) => {
    if (!dt) return "-";
    const t = new Date(dt);
    if (Number.isNaN(t.getTime())) return "-";
    return t.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  };

  // Improved hours formatting
  const fmtHours = (num) => {
    if (num == null || num === undefined || Number.isNaN(Number(num))) return "-";
    const hours = Number(num);
    return hours.toFixed(2);
  };

  // Better punch time formatting - handles both simple time strings and datetime objects
  const formatPunchTime = (timeStr, dateTimeStr) => {
    // If we have a simple time string like "05:54", use it directly
    if (timeStr && typeof timeStr === 'string' && timeStr.match(/^\d{2}:\d{2}$/)) {
      return timeStr;
    }
    
    // If we have a simple time string with seconds, format it
    if (timeStr && typeof timeStr === 'string' && timeStr.match(/^\d{2}:\d{2}:\d{2}$/)) {
      return timeStr.substring(0, 5); // Return HH:MM only
    }
    
    // Otherwise try to format the datetime
    if (dateTimeStr) {
      return fmtTime(dateTimeStr);
    }
    
    return "-";
  };

  const onSelectEmployee = (e) => {
    const u = e.target.value;
    setUserid(u);
    const found = employees.find((x) => String(x.userid) === String(u));
    setName(found ? found.name : "");
    setReports([]);
    setErr("");
  };

  // Validate row data
  const validateRowData = (row) => {
    const requiredFields = ['WorkDate', 'Date'];
    return requiredFields.some(field => row[field] != null);
  };

  // Fetch and normalize report to handle multiple records
  const fetchReport = async () => {
    if (!userid) return setErr("Please select employee");
    if (!fromDate) return setErr("Please select from date");
    if (!toDate) return setErr("Please select to date");
    if (new Date(fromDate) > new Date(toDate)) {
      return setErr("From date cannot be later than to date");
    }

    try {
      setErr("");
      setLoading(true);
      const res = await axios.get(`${API_BASE_URL}/api/punch_report`, {
        params: { userid, fromDate, toDate },
        timeout: 200000,
      });

      console.log("Raw API Response:", res.data);

      const body = res?.data;
      let rows = [];

      if (Array.isArray(body)) {
        rows = body;
      } else if (body && typeof body === "object") {
        if (Array.isArray(body.result)) rows = body.result;
        else if (body.result && typeof body.result === "object") rows = [body.result];
        else rows = [body];
      }

      console.log("Processed rows before validation:", rows);

      if (!rows || rows.length === 0) {
        setErr("No data returned for the selected date range/employee");
        setReports([]);
        return;
      }

      // Filter out rows where essential data is missing
      const validRows = rows.filter(validateRowData);
      console.log("Valid rows after filtering:", validRows);
      
      if (validRows.length === 0) {
        setErr("No valid data found in the response");
        setReports([]);
        return;
      }

      // Filter displayable rows
      const displayableRows = validRows.filter(
        r => r.ShiftID != null && String(r.ShiftID).trim() !== ""
      );
      setReports(displayableRows);

    } catch (error) {
      console.error("Fetch error:", error);
      setErr("Failed to fetch report: " + (error.response?.data?.message || error.message));
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    const today = new Date().toISOString().slice(0, 10);
    setFromDate(today);
    setToDate(today);
    setUserid("");
    setName("");
    setReports([]);
    setErr("");
  };

  const minutesBetween = (a, b) => {
    if (!a || !b) return null;
    const d1 = new Date(a), d2 = new Date(b);
    if (Number.isNaN(d1) || Number.isNaN(d2)) return null;
    return Math.max(0, Math.round((d2 - d1) / 60000));
  };

  // Excel export for multiple records with break times and punches
  const exportExcel = () => {
    if (!reports || reports.length === 0) return;

    const dataRows = reports.map(row => {
      // Use the correct field names from your backend response
      const givenBreakStart = row?.BreakStartDateTime || row?.GivenBreakStart || null;
      const givenBreakEnd   = row?.BreakEndDateTime || row?.GivenBreakEnd || null;
      const takenBreakStart = row?.TakenBreakStart || null;
      const takenBreakEnd   = row?.TakenBreakEnd   || null;

      const givenMinutes = minutesBetween(givenBreakStart, givenBreakEnd);
      const takenMinutes = minutesBetween(takenBreakStart, takenBreakEnd);
      const extraTaken   = (givenMinutes != null && takenMinutes != null)
        ? Math.max(0, takenMinutes - givenMinutes)
        : null;

      return {
        "Employee": name ? `${name} (${userid})` : "-",
        "Date": prettyDateShort(row.WorkDate || row.Date),        
        "Shift ID": row.ShiftID || "-",
        "Shift Time": `${row.ShiftStartTime || "-"} TO ${row.ShiftEndTime || "-"}`,
        "First Punch": formatPunchTime(row.firstpunch, row.FirstPunchInShift),
        "Given Break": givenBreakStart && givenBreakEnd ? 
          `${fmtTimeShort(givenBreakStart)} TO ${fmtTimeShort(givenBreakEnd)}` : 
          row.BreakStartTime && row.BreakEndTime ?
          `${row.BreakStartTime} TO ${row.BreakEndTime}` : "-",
        "Given Duration (MIN)": givenMinutes || "-",
        "Taken Break": takenBreakStart && takenBreakEnd ?
          `${fmtTimeShort(takenBreakStart)} TO ${fmtTimeShort(takenBreakEnd)}` : "-",
        "Taken Duration (MIN)": takenMinutes || "-",
        "Extra Taken (MIN)": extraTaken || "-",
        "Last Punch": formatPunchTime(row.lastpunch, row.LastPunchInShift),
        "All Punches": row.PunchTimes || "-",
        "Total Punches": row.TotalPunches || 0,
        "Hours Worked": fmtHours(row.HoursWorkedInclusive ?? row.HoursWithinShift),
        "Night Shift": row.IsNightShift ? "Yes" : "No"
      };
    });

    const header = Object.keys(dataRows[0]);
    const ws = XLSX.utils.aoa_to_sheet([header]);
    XLSX.utils.sheet_add_json(ws, dataRows, {
      header,
      skipHeader: true,
      origin: "A2"
    });

    // Adjust column widths - make "All Punches" column wider
    ws["!cols"] = header.map(h => ({ 
      wch: h === "All Punches" ? 30 : Math.max(15, String(h).length + 2) 
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "N-Punch Report");
    XLSX.writeFile(wb, `N-Punch-${userid}-${fromDate}-to-${toDate}.xlsx`);
  };

  const showPunches = (timeList, dateLabel) => {
    // timeList is the comma-separated string "07:58:12, 12:01:03 …"
    const arr = (timeList || '')
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);
    setSelectedPunches(arr);
    setModalDate(dateLabel || '');
  };

  const closePunches = () => setSelectedPunches(null);

  return (
    <Container className="mt-4">
      <h2 className="mb-3">N‑PUNCH REPORT</h2>

      {err && (
        <Alert variant="danger" onClose={() => setErr("")} dismissible>
          {err}
        </Alert>
      )}

      <Row className="mb-3">
        <Col md={4}>
          <Form.Label>Employee</Form.Label>
          <Form.Select value={userid} onChange={onSelectEmployee} disabled={loading}>
            <option value="">Select employee</option>
            {employees.map((emp) => (
              <option key={emp.userid} value={emp.userid}>
                {emp.userid} ({emp.name})
              </option>
            ))}
          </Form.Select>
        </Col>
        <Col md={3}>
          <Form.Label>From Date</Form.Label>
          <Form.Control
            type="date"
            value={fromDate}
            onChange={(e) => {
              setFromDate(e.target.value);
              setReports([]);
              setErr("");
            }}
            max={new Date().toISOString().slice(0, 10)}
          />
        </Col>
        <Col md={3}>
          <Form.Label>To Date</Form.Label>
          <Form.Control
            type="date"
            value={toDate}
            onChange={(e) => {
              setToDate(e.target.value);
              setReports([]);
              setErr("");
            }}
            max={new Date().toISOString().slice(0, 10)}
            min={fromDate}
          />
        </Col>
        <Col md={2} className="d-flex align-items-end gap-2 flex-column">
          <div className="d-flex gap-2 w-100">
            <Button 
              onClick={fetchReport} 
              disabled={loading || !userid || !fromDate || !toDate}
              className="flex-grow-1"
            >
              {loading ? (
                <>
                  <Spinner as="span" animation="border" size="sm" className="me-2" />
                  Loading...
                </>
              ) : ("Show")}
            </Button>
          </div>
          <div className="d-flex gap-2 w-100">
            <Button 
              variant="outline-secondary" 
              onClick={reset} 
              disabled={loading}
              size="sm"
              className="flex-grow-1"
            >
              Reset
            </Button>
            {reports && reports.length > 0 && (
              <Button 
                variant="success" 
                onClick={exportExcel} 
                disabled={loading}
                size="sm"
                className="flex-grow-1"
              >
                Excel
              </Button>
            )}
          </div>
        </Col>
      </Row>

      {userid && (
        <div className="mb-3">
          <div><strong>Employee:</strong> {name ? `${name} (${userid})` : "-"}</div>
          <div><strong>Date Range:</strong> {prettyDateShort(fromDate)} to {prettyDateShort(toDate)}</div>
          {reports && reports.length > 0 && (
            <div><strong>Records Found:</strong> {reports.length}</div>
          )}
        </div>
      )}

      {reports && reports.length > 0 && (
        <div className="mt-4">
          <Table striped bordered hover responsive className="small">
            <thead className="table-dark">
              <tr>
                <th style={{ minWidth: '100px' }}>Date</th>
                <th style={{ minWidth: '80px' }}>Shift ID</th>
                <th style={{ minWidth: '120px' }}>Shift Time</th>
                <th style={{ minWidth: '80px' }}>First Punch</th>
                <th style={{ minWidth: '80px' }}>Last Punch</th>
                <th style={{ minWidth: '90px' }}>Punches</th>
                <th style={{ minWidth: '80px' }}>Hours In Shift</th>
                <th style={{ minWidth: '80px' }}>Actual Hours Worked</th>
                <th style={{ minWidth: '80px' }}>Night</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((row, index) => {
                
                
                // Use the correct field names from your backend response
                const givenBreakStart = row?.BreakStartDateTime || row?.GivenBreakStart || null;
                const givenBreakEnd   = row?.BreakEndDateTime || row?.GivenBreakEnd || null;
                const takenBreakStart = row?.TakenBreakStart || null;
                const takenBreakEnd   = row?.TakenBreakEnd   || null;

                const givenMinutes = minutesBetween(givenBreakStart, givenBreakEnd);
                const takenMinutes = minutesBetween(takenBreakStart, takenBreakEnd);
                const extraTaken   = (givenMinutes != null && takenMinutes != null)
                  ? Math.max(0, takenMinutes - givenMinutes)
                  : null;

                return (
                  <tr key={`${row.UserId}-${row.WorkDate || row.Date}-${index}`}>
                    <td>{prettyDateShort(row.WorkDate || row.Date)}</td>
                    <td>{row.ShiftID || "-"}</td>
                    <td>
                      {row.ShiftStartTime && row.ShiftEndTime 
                        ? `${row.ShiftStartTime} TO ${row.ShiftEndTime}`
                        : "-"
                      }
                    </td>
                    <td>{formatPunchTime(row.firstpunch, row.FirstPunchInShift)}</td>
                    
                    <td>{formatPunchTime(row.lastpunch, row.LastPunchInShift)}</td>
                    <td className="text-center">
                      <Button
                        size="sm"
                        variant="info"
                        onClick={() =>
                          showPunches(row.PunchTimes, prettyDateShort(row.WorkDate || row.Date))
                        }
                        disabled={!row.PunchTimes}
                      >
                        View
                      </Button>
                    </td>
                    <td>{fmtHours(row.HoursWorkedInclusive ?? row.HoursWithinShift)}</td>
                    <td>{ row.ActualHoursWorked}</td>
                    <td>
                      <span className={`badge ${row.IsNightShift ? 'bg-primary' : 'bg-secondary'}`}>
                        {row.IsNightShift ? "Yes" : "No"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </Table>

          {/* Summary Row */}
          <div className="mt-3 p-3 bg-light rounded">
            <Row>
              <Col md={6}>
                <strong>Total Records:</strong> {reports.length}
              </Col>
              <Col md={6}>
                <strong>Total Hours Worked:</strong> {
                  reports.reduce((sum, row) => {
                    const hours = parseFloat(row.HoursWorkedInclusive ?? row.HoursWithinShift ?? 0);
                    return sum + (isNaN(hours) ? 0 : hours);
                  }, 0).toFixed(2)
                } Hours
              </Col>
            </Row>
          </div>
        </div>
      )}

      <Modal show={selectedPunches !== null} onHide={closePunches} centered>
        <Modal.Header closeButton>
          <Modal.Title>Punches – {modalDate}</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          {selectedPunches && selectedPunches.length > 0 ? (
            <ListGroup variant="flush">
              {selectedPunches.map((p, idx) => (
                <ListGroup.Item key={idx}>{p}</ListGroup.Item>
              ))}
            </ListGroup>
          ) : (
            <p className="text-muted mb-0">No punches recorded for this shift.</p>
          )}
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={closePunches}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {!loading && (!reports || reports.length === 0) && userid && fromDate && toDate && (
        <Alert variant="info" className="mt-3">
          No report data found for the selected employee and date range.
        </Alert>
      )}
    </Container>
  );
};

export default NPunchReport;
