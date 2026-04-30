import {
  Fab, DialogActions, Container, Typography, Box, Grid,
  Dialog, DialogContent, DialogContentText, LinearProgress, Button, TextField
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import React, { useState, FormEvent, ChangeEvent } from 'react'
import { publishCommitment } from '../utils/publishCommitment'
import { WalletClient } from '@bsv/sdk'
import { toast } from 'react-toastify'

const CommitmentForm = () => {
  const [file, setFile] = useState<File | null>(null)
  const [fileURL, setFileURL] = useState<string>('')
  const [hostingTime, setHostingTime] = useState<number>(0)
  const [formOpen, setFormOpen] = useState<boolean>(false)
  const [formLoading, setFormLoading] = useState<boolean>(false)
  const [useURL, setUseURL] = useState<boolean>(false)
  const hostingURL = 'https://nanostore.babbage.systems'
  const [committedURL, setCommittedURL] = useState<string | null>(null)

  // TODO 1: Handle file input changes
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0])
    }
  }

  // TODO 2: Handle form submission
  const handleFormSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setFormLoading(true)

    let blobURL: string | null = null

    try {
      let submitURL: string

      if (useURL) {
        if (!fileURL) {
          console.log('No URL provided')
          toast.error('No URL provided')
          setFormLoading(false)
          return
        }
        submitURL = fileURL
      } else {
        if (!file) {
          console.log('No file selected')
          toast.error('No file selected')
          setFormLoading(false)
          return
        }
        // Convert file to a blob URL for fetching
        blobURL = URL.createObjectURL(file)
        submitURL = blobURL
      }

      if (hostingTime <= 0) {
        toast.error('Hosting time must be greater than 0')
        setFormLoading(false)
        return
      }

      const wallet = new WalletClient()
      const { publicKey: address } = await wallet.getPublicKey({ identityKey: true })

      const uhrpURL = await publishCommitment({
        url: submitURL,
        hostingMinutes: hostingTime,
        address,
        serviceURL: hostingURL,
        testWerrLabel: false
      })

      console.log('Commitment published:', uhrpURL)
      setCommittedURL(uhrpURL)
      toast.success('Commitment published successfully!')
      setFormOpen(false)
    } catch (error) {
      console.error('Failed to publish commitment:', error)
      toast.error(`Failed: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      if (blobURL) URL.revokeObjectURL(blobURL)
    }

    setFormLoading(false)
  }

  return (
    <Container maxWidth="sm">
      <Box mt={5} p={3} border={1} borderRadius={4} borderColor="grey.300">
        <Typography variant="h4" gutterBottom>
          Create File Storage Commitment
        </Typography>
        <Fab color="primary" onClick={() => setFormOpen(true)}>
          <AddIcon />
        </Fab>
        <Grid>
          <Dialog open={formOpen} onClose={() => setFormOpen(false)}>
            <form onSubmit={handleFormSubmit}>
              <DialogContent>
                <DialogContentText paragraph>
                  {useURL
                    ? 'Enter the URL of the file and specify the hosting time.'
                    : 'Upload a file and specify the hosting time to create a file storage commitment.'}
                </DialogContentText>
                <Button
                  variant="outlined"
                  onClick={() => setUseURL(!useURL)}
                  style={{ marginBottom: '16px' }}
                >
                  {useURL ? 'Switch to File Upload' : 'Switch to URL Input'}
                </Button>
                {useURL ? (
                  <TextField
                    label="File URL"
                    fullWidth
                    margin="normal"
                    onChange={(e) => setFileURL(e.target.value)}
                    value={fileURL}
                    required
                  />
                ) : (
                  <input
                    type="file"
                    onChange={handleFileChange}
                    required
                    style={{ display: 'block', marginBottom: '16px' }}
                  />
                )}
                <TextField
                  label="Hosting Time (minutes)"
                  type="number"
                  fullWidth
                  margin="normal"
                  onChange={(e) => setHostingTime(Number(e.target.value))}
                  value={hostingTime}
                  required
                />
              </DialogContent>
              {formLoading ? (
                <LinearProgress />
              ) : (
                <DialogActions>
                  <Button onClick={() => setFormOpen(false)}>Cancel</Button>
                  <Button type="submit" color="primary">
                    Submit
                  </Button>
                </DialogActions>
              )}
            </form>
          </Dialog>
        </Grid>

        {/* TODO 3: Display published UHRP URL */}
        {committedURL && (
          <Box mt={3} p={2} sx={{
            background: 'rgba(0, 212, 255, 0.08)',
            border: '1px solid rgba(0, 212, 255, 0.3)',
            borderRadius: 2
          }}>
            <Typography variant="subtitle2" color="primary" gutterBottom>
              Published UHRP URL:
            </Typography>
            <Typography
              variant="body2"
              sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}
            >
              {committedURL}
            </Typography>
          </Box>
        )}
      </Box>
    </Container>
  )
}

export default CommitmentForm
