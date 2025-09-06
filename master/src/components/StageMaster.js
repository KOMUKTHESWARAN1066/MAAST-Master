import React, { useEffect, useState } from "react";
import axios from "axios";
import { Container, Table, Button } from "react-bootstrap";
import {
  TextField,
  Select,
  MenuItem,
  Snackbar,
  Typography,
} from "@mui/material";
import MuiAlert from "@mui/material/Alert";
import { MdEdit, MdDelete } from "react-icons/md";
import "../styles/StageMaster.css";
import emvLogo from "../pictures/emvlogo.png";

const Alert = React.forwardRef(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

const StageMaster = () => {
  const [stages, setStages] = useState([]);
  const [newStage, setNewStage] = useState({
    Stage_name: "",
    Stage_Type: "",
    Stage_Serial: "",
  });
  const [notification, setNotification] = useState("");
  const [editingStage, setEditingStage] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [stageTypes, setStageTypes] = useState([]);
  const [newStageType, setNewStageType] = useState("");
  const [showAddStageType, setShowAddStageType] = useState(false);

  useEffect(() => {
    fetchData();
    fetchStageTypes();
  }, []);

  const fetchData = async () => {
    try {
      const response = await axios.get(
        "https://192.168.2.54:443/api/stage-master"
      );
      const sorted = response.data.sort(
        (a, b) => a.Stage_Serial - b.Stage_Serial
      );
      setStages(sorted);
    } catch (error) {
      console.error("Error fetching stage data:", error);
    }
  };

  const fetchStageTypes = async () => {
    try {
      const response = await axios.get(
        "https://192.168.2.54:443/api/stage-master/types"
      );
      setStageTypes(response.data);
    } catch (error) {
      console.error("Error fetching stage types:", error);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const newValue = name === "Stage_Serial" ? parseInt(value) : value;
    setNewStage({ ...newStage, [name]: newValue });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingStage) {
      await updateStage();
    } else {
      await addStage();
    }
  };

  const addStage = async () => {
    try {
      const response = await axios.post(
        "https://192.168.2.54:443/api/stage-master",
        newStage
      );
      setStages([...stages, response.data]);
      setNewStage({ Stage_name: "", Stage_Type: "", Stage_Serial: "" });
      setNotification("Stage added successfully");
      setSnackbarOpen(true);
      fetchData();
    } catch (error) {
      console.error("Error adding stage:", error);
      setNotification(
        error.response?.status === 409
          ? "Stage Name already exists"
          : "Error adding stage"
      );
      setSnackbarOpen(true);
    }
  };

  const updateStage = async () => {
    try {
      await axios.put(
        `https://192.168.2.54:443/api/stage-master/${editingStage.Stage_id}`,
        newStage
      );
      setNewStage({ Stage_name: "", Stage_Type: "", Stage_Serial: "" });
      setEditingStage(null);
      setNotification("Stage updated successfully");
      setSnackbarOpen(true);
      fetchData();
    } catch (error) {
      console.error("Error updating stage:", error);
      setNotification("Error updating stage");
      setSnackbarOpen(true);
    }
  };

  const deleteStage = async (Stage_id) => {
    try {
      await axios.delete(`https://192.168.2.54:443/api/stage-master/${Stage_id}`);
      setStages(stages.filter((stage) => stage.Stage_id !== Stage_id));
      fetchData();
      setNotification("Stage deleted successfully");
      setSnackbarOpen(true);
    } catch (error) {
      console.error("Error deleting stage:", error);
      setNotification("Error deleting stage");
      setSnackbarOpen(true);
    }
  };

  const editStage = (stage) => {
    setNewStage({
      Stage_name: stage.Stage_name,
      Stage_Type: stage.Stage_Type,
      Stage_Serial: stage.Stage_Serial,
    });
    setEditingStage(stage);
  };

  const cancelEdit = () => {
    setNewStage({ Stage_name: "", Stage_Type: "", Stage_Serial: "" });
    setEditingStage(null);
  };

  const handleSnackbarClose = () => {
    setSnackbarOpen(false);
  };

  const handleAddStageType = () => {
    if (newStageType.trim() !== "" && !stageTypes.includes(newStageType)) {
      setStageTypes([...stageTypes, newStageType]);
      setNewStageType("");
      setShowAddStageType(false);
    }
  };

  const handleDeleteStageType = (type) => {
    if (
      window.confirm(
        `Are you sure you want to delete the stage type: "${type}"?`
      )
    ) {
      setStageTypes(stageTypes.filter((stageType) => stageType !== type));
      setNotification("Stage Type deleted successfully");
      setSnackbarOpen(true);
    }
  };

  return (
    <Container
      fluid
      className="container-fluid"
      style={{
        backgroundImage: `url(${emvLogo})`,
        backgroundSize: "auto",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
        minHeight: "auto",
        opacity: "0.9",
      }}
    >
      <Typography variant="h4" align="left" gutterBottom>
        Stage Master
      </Typography>

      <form onSubmit={handleSubmit} className="form-container">
        <TextField
          label="S.No"
          name="Stage_Serial"
          type="number"
          value={newStage.Stage_Serial}
          onChange={handleChange}
          className="form-input"
          required
          fullWidth
          margin="normal"
        />

        <TextField
          label="Stage Name"
          name="Stage_name"
          value={newStage.Stage_name}
          onChange={handleChange}
          className="form-input"
          required
          fullWidth
          margin="normal"
        />

        <Select
          name="Stage_Type"
          value={newStage.Stage_Type}
          onChange={handleChange}
          className="form-select"
          fullWidth
          required
        >
          {stageTypes.map((type, index) => (
            <MenuItem key={index} value={type}>
              {type}
              {type !== newStage.Stage_Type && (
                <Button
                  onClick={() => handleDeleteStageType(type)}
                  color="secondary"
                  size="small"
                  style={{ marginLeft: "10px" }}
                >
                  <MdDelete />
                </Button>
              )}
            </MenuItem>
          ))}
        </Select>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginTop: "10px",
          }}
        >
          <div
            className="button-group"
            style={{ display: "flex", gap: "10px" }}
          >
            <Button
              type="submit"
              variant="contained"
              color="primary"
              className="form-button"
            >
              {editingStage ? "Update Stage" : "Add Stage"}
            </Button>
            {editingStage && (
              <Button
                variant="outlined"
                onClick={cancelEdit}
                className="form-button"
              >
                Cancel
              </Button>
            )}
          </div>
          <Button
            type="button"
            variant="contained"
            color="primary"
            onClick={() => setShowAddStageType(!showAddStageType)}
          >
            {showAddStageType ? "Cancel" : "Add New Stage Type"}
          </Button>
        </div>

        {showAddStageType && (
          <div
            style={{
              marginTop: "10px",
              display: "flex",
              gap: "10px",
              alignItems: "center",
            }}
          >
            <TextField
              label="Enter New Stage Type"
              value={newStageType}
              onChange={(e) => setNewStageType(e.target.value)}
              fullWidth
              margin="normal"
            />
            <Button
              variant="contained"
              color="primary"
              className="form-button"
              onClick={handleAddStageType}
            >
              Add
            </Button>
          </div>
        )}
      </form>

      <Table
        striped
        bordered
        hover
        responsive
        className="table-container tableStyle"
      >
        <thead>
          <tr>
            <th>S.No</th>
            <th>Stage Name</th>
            <th>Stage Type</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {stages.map((stage) => (
            <tr key={stage.Stage_id}>
              <td>{stage.Stage_Serial}</td>
              <td>{stage.Stage_name}</td>
              <td>{stage.Stage_Type}</td>
              <td>
                <Button onClick={() => editStage(stage)} variant="warning">
                  <MdEdit />
                </Button>
                &nbsp;
                <Button
                  onClick={() => deleteStage(stage.Stage_id)}
                  variant="danger"
                >
                  <MdDelete />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity="success"
          sx={{ width: "100%" }}
        >
          {notification}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default StageMaster;
