import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Form, Container, Card, Alert } from 'react-bootstrap';
import axios from 'axios';
import { styled } from '@mui/system';
import { Typography } from '@mui/material';
import 'font-awesome/css/font-awesome.min.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import '../styles/LoginPage.css';

const StyledCard = styled(Card)({
  background: '#1A2226',
  borderRadius: '15px',
  border: 'none',
  boxShadow: '0 3px 6px rgba(0, 0, 0, 0.16), 0 3px 6px rgba(0, 0, 0, 0.23)',
});

const InputField = styled(Form.Control)({
  backgroundColor: '#ECF0F5',
  border: 'none',
  borderBottom: '2px solid #6C6C6C',
  borderRadius: '0px',
  fontWeight: 'bold',
  outline: 0,
  marginBottom: '20px',
  color: '#333',
  '&::placeholder': {
    color: '#888',
  },
});

const LoginButton = styled(Button)(({
  backgroundColor: 'transparent',
  borderColor: '#0DB8DE',
  color: '#0DB8DE',
  borderRadius: '0px',
  fontWeight: 'bold',
  letterSpacing: '1px',
  boxShadow: '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
  '&:hover': {
    backgroundColor: '#0DB8DE',
  },
}));

const LoginPage = () => {
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [isValid, setIsValid] = useState({ userId: null, password: null });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [loginerror, setLoginError] = useState(false);
  
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [passwordTimeout, setPasswordTimeout] = useState(null); // State for timeout
  const navigate = useNavigate();

  const validateUserId = (value) => {
    const isValidUserId = value.length >= 3;
    setIsValid((prevState) => ({ ...prevState, userId: isValidUserId }));
    setUserId(value);
  };

  // Validate password (at least 8 characters with a number)
  const validatePassword = (value) => {
    const passwordValid = value.length >= 8 && /\d/.test(value);
    setIsValid((prevState) => ({ ...prevState, password: passwordValid }));
    setPassword(value);
    setError('')

    if (!passwordValid) {
      setAlertMessage('Password is required !...');
      
      // Clear previous timeout if any
      if (passwordTimeout) clearTimeout(passwordTimeout);
      
      // Set timeout to clear the alert message
      const timer = setTimeout(() => {
        setAlertMessage('');
      }, 2000);
      
      // Store the timer ID so it can be cleared later
      setPasswordTimeout(timer);
    } else {
      setAlertMessage('');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (isValid.userId && isValid.password) {
      setLoading(true);
      setError(''); 
      try {

        const response = await axios.post('https://192.168.2.54:443/api/login', {
          userId,
          password,
        });

        if (response.data.success)
          {
            const user = response.data.user;

        // store user data in session
        sessionStorage.setItem('authToken', response.data.token);
        localStorage.setItem("Token",response.data.token);
       // Store as string directly (no quotes)
sessionStorage.setItem("AdminFlag", user.Adminflag);



        // Check role
        if (user.Adminflag === '1') {
          navigate("/home"); // route for admin
        } else {
          navigate("/user-shift-upload"); // route for employee
        }
      } 
            else {
          setError(response.data.message || 'Invalid credentials.');
        }
      } catch (error) {
         setError('Invalid credentials.');
      } finally {
        setLoading(false);
      }
    } else {
      setError('Please provide valid userId and password.');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setMessage('New passwords do not match.');
      return;
    }
    console.log(userId, oldPassword, newPassword);
    try {
      const response = await axios.post('https://192.168.2.54:443/api/change-password', {
        userId,
        oldPassword,
        newPassword,
      });

      const data = response.data;

      if (data.success) {
        setMessage('Password changed successfully!');
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => {
          navigate('/home');
        }, 1000);
      } else {
        
        setError(data.message);
      }
    } catch (error) {
      setMessage('An error occurred.');
      console.error('Error:', error);
    }
  };

  return (
    <Container className="d-flex align-items-center justify-content-center"
      style={{ minHeight: '100vh', maxWidth: '100%', background: '#222D32' }}>
      <StyledCard class='p-4 login-box'>
        <div class='col-lg-12 login-key'>
          <i class="fa fa-key" aria-hidden="true"></i>
        </div>
        <Typography variant="h4" align="center" gutterBottom style={{ color: '#ECF0F5' }}>
          {showChangePassword ? 'CHANGE PASSWORD' : 'LOGIN'}
          {}
        </Typography>
        <div class='col-lg-12 login-form'>

          {!showChangePassword ? (
            <Form noValidate onSubmit={handleLogin} class="mb-3">
              <Form.Group controlId="formUserId">
                <Form.Label class='form-control-label' style={{ color: '#6C6C6C' }}>
                  User ID
                </Form.Label>
                <InputField
                  type="text"
                  placeholder="Enter User ID"
                  required
                  value={userId}
                  onChange={(e) => validateUserId(e.target.value)}
                  style={{
                    borderColor: isValid.userId === null ? 'gray' : isValid.userId ? 'green' : 'red',
                  }}
                />
                {isValid.userId === false && (
                  <p class='error' style={{ color: 'red' }}>User ID is required !..</p>
                )}
              </Form.Group>

              <Form.Group controlId="formPassword">
                <Form.Label class='form-control-label' style={{ color: '#6C6C6C' }}>
                  Password
                </Form.Label>
                <InputField
                  type="password"
                  placeholder="Enter Password"
                  required
                  value={password}
                  onChange={(e) => validatePassword(e.target.value)}
                  style={{
                    borderColor: isValid.password === null ? 'gray' : isValid.password ? 'green' : 'red',
                  }}
                />
              </Form.Group>
              {alertMessage && <p class='alert' style={{ color: 'red' }}>{alertMessage}</p>}
              {error && (
                <Alert variant="danger" className="text-center mb-3" style={{background:'#f8d7da', color:'#58151c'}}>
                  {error}
                </Alert>
              )}
              <div class='loginbttm' >
                <div class='login-button' type="submit">
                  <LoginButton
                    class='w-100'
                    type="submit"
                    disabled={loading}
                  >
                    {loading ? 'Logging In...' : 'Login'}
                  </LoginButton>
                </div>
              </div>
            </Form>
          ) : (
            <Form noValidate onSubmit={handleChangePassword}>
              <Form.Group controlId="formOldPassword">
                <Form.Label class='form-control-label' style={{ color: '#6C6C6C' }}>
                  Old Password
                </Form.Label>
                <InputField
                  type="password"
                  placeholder="Enter Old Password"
                  required
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                />
              </Form.Group>

              <Form.Group controlId="formNewPassword">
                <Form.Label class='form-control-label' style={{ color: '#6C6C6C' }}>
                  New Password
                </Form.Label>
                <InputField
                  type="password"
                  placeholder="Enter New Password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </Form.Group>

              <Form.Group controlId="formConfirmPassword">
                <Form.Label class='form-control-label' style={{ color: '#6C6C6C' }}>
                  Confirm Password
                </Form.Label>
                <InputField
                  type="password"
                  placeholder="Confirm New Password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </Form.Group>
              {message && (
                <Alert variant="info" className="text-center mb-3" style={{background:'#f8d7da', color:'#58151c'}}>
                  {message}
                </Alert>
              )}
              <div class='loginbttm'>
                <div class='login-button'>
                  <LoginButton class="w-100" type="submit">
                    Change Password
                  </LoginButton>
                </div>
              </div>
            </Form>
          )}
        </div>
      </StyledCard>
    </Container>
  );
};

export default LoginPage;