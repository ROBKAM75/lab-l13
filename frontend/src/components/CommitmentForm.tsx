import {
  Fab, DialogActions, Container, Typography, Box, Grid,
  Dialog, DialogContent, DialogContentText, LinearProgress, Button, TextField, CircularProgress
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import React, { useState, FormEvent, ChangeEvent } from 'react'
import { publishCommitment } from '../utils/publishCommitment'
import { StorageDownloader, LookupResolver, Transaction, PushDrop, Utils } from '@bsv/sdk'
import { toast } from 'react-toastify'

interface DownloadRecord {
  uhrpURL: string
  downloadedAt: string
  mimeType: string | null
  sizeBytes: number
  expiryTime: number | null
}

const getExpiryTime = async (uhrpUrl: string): Promise<number | null> => {
  try {
    const resolver = new LookupResolver({ networkPreset: 'mainnet' })
    const response = await resolver.query({ service: 'ls_uhrp', query: { uhrpUrl } })
    if (response.type !== 'output-list' || response.outputs.length === 0) return null
    const tx = Transaction.fromBEEF(response.outputs[0].beef)
    const { fields } = PushDrop.decode(tx.outputs[response.outputs[0].outputIndex].lockingScript)
    return new Utils.Reader(fields[3]).readVarIntNum()
  } catch {
    return null
  }
}

const formatTimeRemaining = (expiryTime: number): string => {
  const secondsLeft = expiryTime - Math.floor(Date.now() / 1000)
  if (secondsLeft <= 0) return 'Expired'
  const minutes = Math.floor(secondsLeft / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  if (days > 0) return `${days}d ${hours % 24}h remaining`
  if (hours > 0) return `${hours}h ${minutes % 60}m remaining`
  return `${minutes}m remaining`
}

const CommitmentForm = () => {
  const [file, setFile] = useState<File | null>(null)
  const [fileURL, setFileURL] = useState<string>('')
  const [hostingTime, setHostingTime] = useState<number>(0)
  const [formOpen, setFormOpen] = useState<boolean>(false)
  const [formLoading, setFormLoading] = useState<boolean>(false)
  const [useURL, setUseURL] = useState<boolean>(false)
  const hostingURL = 'https://nanostore.babbage.systems'
  const [committedURL, setCommittedURL] = useState<string | null>(null)
  const [downloading, setDownloading] = useState<boolean>(false)
  const [statusMsg, setStatusMsg] = useState<string>('')
  const [lookupURL, setLookupURL] = useState<string>('')
  const [lookupDownloading, setLookupDownloading] = useState<boolean>(false)
  const [downloadHistory, setDownloadHistory] = useState<DownloadRecord[]>([])

  const downloadByURL = async (uhrpUrl: string, setLoading: (v: boolean) => void) => {
    setLoading(true)
    try {
      console.log('Downloading file from UHRP URL:', uhrpUrl)
      const downloader = new StorageDownloader({ networkPreset: 'mainnet' })
      const [result, expiryTime] = await Promise.all([
        downloader.download(uhrpUrl),
        getExpiryTime(uhrpUrl)
      ])
      const blob = new Blob([result.data], { type: result.mimeType || 'application/octet-stream' })
      const blobURL = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobURL
      a.download = 'uhrp-file'
      a.click()
      URL.revokeObjectURL(blobURL)
      console.log('File downloaded, mimeType:', result.mimeType)
      setDownloadHistory(prev => [{
        uhrpURL: uhrpUrl,
        downloadedAt: new Date().toLocaleString(),
        mimeType: result.mimeType,
        sizeBytes: result.data.length,
        expiryTime
      }, ...prev])
      toast.success('File downloaded successfully!')
    } catch (error) {
      console.error('Failed to download file:', error)
      toast.error(`Download failed: ${error instanceof Error ? error.message : String(error)}`)
    }
    setLoading(false)
  }

  const handleDownload = () => downloadByURL(committedURL!, setDownloading)
  const handleLookupDownload = () => {
    if (!lookupURL.trim()) {
      toast.error('Please paste a UHRP URL first')
      return
    }
    downloadByURL(lookupURL.trim(), setLookupDownloading)
  }

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

      setStatusMsg('Uploading file to nanostore...')
      const uhrpURL = await publishCommitment({
        url: submitURL,
        hostingMinutes: hostingTime,
        serviceURL: hostingURL,
        testWerrLabel: false
      })
      setStatusMsg('Done!')

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
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 3, gap: 2 }}>
                  <CircularProgress size={48} thickness={4} />
                  <Typography variant="body2" color="text.secondary">
                    {statusMsg || 'Processing...'}
                  </Typography>
                </Box>
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
              sx={{ fontFamily: 'monospace', wordBreak: 'break-all', mb: 1 }}
            >
              {committedURL}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
              To access it you'd use the StorageDownloader from @bsv/sdk, or a UHRP-compatible
              browser/resolver that can look up the file by its hash. It's not a regular HTTP link —
              it's a content-addressed URL (like IPFS but on BSV).
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={handleDownload}
              disabled={downloading}
            >
              {downloading ? 'Downloading...' : 'Download File'}
            </Button>
          </Box>
        )}
        <Box mt={3} p={2} sx={{
          background: 'rgba(123, 47, 247, 0.08)',
          border: '1px solid rgba(123, 47, 247, 0.3)',
          borderRadius: 2
        }}>
          <Typography variant="subtitle2" color="secondary" gutterBottom>
            Download File by UHRP URL
          </Typography>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 2 }}>
            Paste any UHRP URL to retrieve the file from the BSV storage network.
          </Typography>
          <TextField
            label="UHRP URL"
            fullWidth
            size="small"
            value={lookupURL}
            onChange={(e) => setLookupURL(e.target.value)}
            placeholder="XUT..."
            sx={{ mb: 2 }}
          />
          <Button
            variant="outlined"
            size="small"
            color="secondary"
            onClick={handleLookupDownload}
            disabled={lookupDownloading}
          >
            {lookupDownloading ? 'Downloading...' : 'Download File'}
          </Button>
        </Box>

        {downloadHistory.length > 0 && (
          <Box mt={3} p={2} sx={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 2
          }}>
            <Typography variant="subtitle2" gutterBottom>
              Download History
            </Typography>
            {downloadHistory.map((record, idx) => (
              <Box key={idx} mb={1.5} p={1.5} sx={{
                background: 'rgba(255,255,255,0.04)',
                borderRadius: 1,
                borderLeft: '3px solid rgba(0, 212, 255, 0.5)'
              }}>
                <Typography variant="caption" sx={{ fontFamily: 'monospace', wordBreak: 'break-all', display: 'block' }}>
                  {record.uhrpURL}
                </Typography>
                <Typography variant="caption" color="text.secondary" display="block">
                  Downloaded: {record.downloadedAt} · {record.mimeType || 'unknown type'} · {(record.sizeBytes / 1024).toFixed(1)} KB
                </Typography>
                <Typography variant="caption" sx={{
                  color: record.expiryTime
                    ? (record.expiryTime - Date.now() / 1000 > 300 ? '#4caf50' : '#ff9800')
                    : 'text.secondary'
                }}>
                  {record.expiryTime ? formatTimeRemaining(record.expiryTime) : 'Expiry unknown'}
                </Typography>
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Container>
  )
}

export default CommitmentForm
