import React, { useState, useEffect, useRef } from "react";
import {
  Container,
  Row,
  Col,
  Table,
  Button,
  Form,
  Spinner,
  Alert,
} from "react-bootstrap";
import axios from "axios";
import { DateTime } from "luxon";
import * as XLSX from "xlsx";

const EmployeePunctuality = () => {
  const [employeeName, setEmployeeName] = useState("");
  const [employeeOptions, setEmployeeOptions] = useState([]);
  const [PunctualityData, setPunctualityData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [employeeId,setEmployeeid]=useState()
  
    const [fromDate, setFromDate] = useState(new Date());
    const [toDate, setToDate] = useState(new Date());
const formatDate = (date) => {
  if (!date) return ""; // avoid invalid value
  const d = new Date(date);
  if (isNaN(d.getTime())) return ""; // handle invalid date
  return d.toISOString().split("T")[0]; // yyyy-MM-dd
}

const formatDates = (dateStr) => {
  if (!dateStr || typeof dateStr !== "string" || dateStr.trim() === "") {
    return "N/A";
  }

  const parts = dateStr.split("/");
  if (parts.length !== 3) {
    return "N/A";
  }

  const [day, month, year] = parts;
  return `${day}-${month}-${year}`; // dd-mm-yyyy
};


  useEffect(() => {
    // Fetch employee list for dropdown
const fetchEmployees = async () => {
  try {
    const res = await axios.get("https://192.168.2.54:443/api/employees");

    if (Array.isArray(res.data)) {
      setEmployeeOptions(res.data); // keep objects [{ name, userid }]
    }
  } catch (err) {
    console.error("Error fetching employee list:", err);
  }
};


    fetchEmployees();
  }, []);
const fetchPunctuality = async () => {
  
  if (!employeeId) {
    setError("Please select an employee.");
    return;
  }

  setError("");
  setLoading(true);

  try {
    const response = await axios.post(
      "https://192.168.2.54:443/api/employee-punctuality",
      {
        fromDate: formatDate(fromDate),
        toDate: formatDate(toDate),
        employeeId: employeeId, // ✅ send employeeId instead of name
      },
      { timeout: 330000 }
    );
    
    if (response.data && Array.isArray(response.data.records)) {
      setPunctualityData(response.data.records);
      if (response.data.records.length === 0) {
        setError("No Punctuality found for the selected filters.");
      }
    } else {
      setError("Invalid response format from server.");
    }
  } catch (error) {
    console.error("Error fetching employee Punctuality:", error);
    if (error.code === "ECONNABORTED") {
      setError("Request timeout. Please try again.");
    } else if (error.response) {
      setError(
        `Server error: ${error.response.data || error.response.statusText}`
      );
    } else if (error.request) {
      setError("Network error. Please check your connection.");
    } else {
      setError("An unexpected error occurred. Please try again.");
    }
    setPunctualityData([]);
  } finally {
    setLoading(false);
  }
};


const downloadExcel = () => {
  if (!Array.isArray(PunctualityData) || PunctualityData.length === 0) {
    setError("No Punctuality data to export.");
    return;
  }

  try {
    const worksheetData = [
      ["EMPLOYEE Punctuality"], // Main title
      ["NAME: ",employeeName, ""],
      ["ID NO.", employeeId || "", "","", "TO"], // You can pass employeeId
      [], // Empty row
      ["SL NO.", "DATE", "SHIFT NAME","SHIFT TIME", "IN-PUNCH TIME", "ACTUAL PUNCH",  "PUNCTUALITY"], // Table Header
      ...PunctualityData.map((item, index) => [
        index + 1,
        formatDates(item.DATE)
         ,
         
        item.SHIFTNAME || "",
        item.SHIFT || "",
        item.ScheduledStart || "",
        item.ActualPunch || "",
        item.PUNCTUALITY || "",
      ]),
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // Merge cells for title and headers
    worksheet["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }, // EMPLOYEE Punctuality merged across 7 columns
    ];

    // Set column widths
    worksheet["!cols"] = [
      { wch: 8 }, // SL NO.
      { wch: 12 }, // DATE
      { wch: 15 }, // SHIFT
      { wch: 12 }, // LINE
      { wch: 15 }, // STAGE
      { wch: 15 }, // ATTENDANCE
      { wch: 20 }, // PUNCTUALITY
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Employee Punctuality");

    const fileName = `EmployeePunctuality__${employeeName}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    setError("");
  } catch (error) {
    console.error("Error downloading Excel:", error);
    setError("Failed to download Excel file. Please try again.");
  }
};

  const resetFilters = () => {
    setEmployeeName("");
    setPunctualityData([]);
    setError("");
  };

  return (
    <Container className="mt-4">
      <h2 className="mb-3">Employee Punctuality</h2>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      <Row className="mb-3">
     
       
        <Col md={4}>
        <Form.Label>Employee *</Form.Label>
<Form.Select
  className="form-select"
  value={employeeId}
  onChange={(e) => {
    const selectedIndex = e.target.selectedIndex;
    const selectedEmp = employeeOptions[selectedIndex - 1]; // because index 0 is "Select Employee"
    setEmployeeid(e.target.value);
    if (selectedEmp) {
      setEmployeeName(selectedEmp.name);
    }
  }}
>
  <option value="">Select Employee</option>
  {employeeOptions.map((emp, idx) => (
    <option key={idx} value={emp.userid}>
      {emp.userid} ({emp.name})
    </option>
  ))}
</Form.Select>


        </Col>

        <Col md={4}>
          <Form.Label>From Date *</Form.Label>
          <Form.Control
            type="date"
            className="form-control"
            value={formatDate(fromDate)}
            onChange={(e) => setFromDate(new Date(e.target.value))}
            max={formatDate(new Date())}
          />
        </Col>

        <Col md={4}>
          <Form.Label>To Date *</Form.Label>
          <Form.Control
            type="date"
            className="form-control"
            value={formatDate(toDate)}
            onChange={(e) => setToDate(new Date(e.target.value))}
            max={formatDate(new Date())}
          />





        </Col>
      </Row>

      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <Button onClick={fetchPunctuality} disabled={loading} className="me-2">
            {loading ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  size="sm"
                  role="status"
                  aria-hidden="true"
                  className="me-2"
                />
                Loading...
              </>
            ) : (
              "Show Punctuality"
            )}
          </Button>
          <Button variant="outline-secondary" onClick={resetFilters}>
            Reset Filters
          </Button>
        </div>

        {PunctualityData.length > 0 && (
          <Button variant="success" onClick={downloadExcel}>
            📥 Download Excel
          </Button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-4">
          <Spinner animation="border" />
          <p className="mt-2">Loading employee ...</p>
        </div>
      ) : PunctualityData.length > 0 ? (
        <>
          <Table striped bordered hover responsive>
            <thead className="table-dark">
              <tr>
                <th>S.No</th>
                <th>Date</th>
                <th>Shift Name</th>
                <th>Shift Time</th>
                <th>In-Puch Time</th>
                <th>Actual Punch</th>
                <th>Punctuality</th>
              </tr>
            </thead>
            <tbody>
              {PunctualityData.map((item, index) => (
                <tr key={index}>
                  <td>{index + 1}</td>
                 <td>{formatDates(item.DATE)}</td>

                  
                  <td>{item.SHIFTNAME || "N/A"}</td>
                  
                  <td>{item.SHIFT || "N/A"}</td>

                  <td>{item.ScheduledStart || "N/A"}</td>
                  <td>{item.ActualPunch || "N/A"}</td>
                  <td>{item.PUNCTUALITY || "N/A"}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </>
      ) : (
        <div className="text-center py-4">
          <p className="text-muted">
            No employee Punctuality data found. Please select your filters and click
            "Show Punctuality" to view data.
          </p>
        </div>
      )}
    </Container>
  );
};

export default EmployeePunctuality;
