import React from 'react'
import { Container, Typography, Box, Stack } from '@mui/material'
import CommitmentForm from './components/CommitmentForm'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import './App.scss'

export default function App() {
  return (
    <Box sx={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0e27 0%, #1a1040 50%, #0a0e27 100%)'
    }}>
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Stack spacing={4} alignItems="center">
          <Box sx={{ textAlign: 'center' }}>
            <Typography
              variant="h3"
              fontWeight="bold"
              sx={{
                background: 'linear-gradient(90deg, #00d4ff, #7b2ff7, #ff00ff)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                mb: 1
              }}
            >
              iCommit App
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Lab L-13 — File Storage Commitments with UHRP
            </Typography>
          </Box>
          <CommitmentForm />
        </Stack>
      </Container>
      <ToastContainer position="bottom-right" theme="dark" />
    </Box>
  )
}
