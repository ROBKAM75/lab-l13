import { PushDrop, Utils, Transaction, TopicBroadcaster, WalletClient, StorageUploader, StorageUtils, WERR_REVIEW_ACTIONS } from '@bsv/sdk'

export async function publishCommitment({
  url,
  hostingMinutes,
  address,
  serviceURL = 'https://nanostore.babbage.systems',
  testWerrLabel = false
}: {
  url: string
  hostingMinutes: number
  address: string
  serviceURL?: string
  testWerrLabel: boolean
}): Promise<string> {
  try {
    console.log('Starting publishCommitment')
    console.log('URL:', url)
    console.log('Service URL:', serviceURL)

    // TODO 1: Fetch file from URL
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch file: HTTP ${response.status}`)
    }
    const fileBuffer = await response.arrayBuffer()
    const fileData = new Uint8Array(fileBuffer)
    console.log('File fetched, size:', fileData.length, 'bytes')

    // TODO 2: Initialize WalletClient and StorageUploader
    const wallet = new WalletClient()
    const uploader = new StorageUploader({
      storageURL: serviceURL,
      wallet
    })

    // TODO 3: Convert file to uploadable format
    const mimeType = response.headers.get('content-type') || 'application/octet-stream'
    const uploadableFile = {
      data: fileData,
      type: mimeType
    }

    // TODO 4: Upload file and get UHRP URL
    const uploadResult = await uploader.publishFile({
      file: uploadableFile,
      retentionPeriod: hostingMinutes
    })
    const UHRPURL = uploadResult.uhrpURL

    console.log('Generated UHRP URL:', UHRPURL)

    // TODO 5: Generate UHRP hash
    const UHRHash = StorageUtils.getHashFromURL(UHRPURL)

    console.log('Generated UHR Hash:', UHRHash)

    // TODO 6: Calculate expiry time
    const expiryTime = Math.floor(Date.now() / 1000) + (hostingMinutes * 60)

    // TODO 7: Create and broadcast UHRP token
    const pushdrop = new PushDrop(wallet)
    const lockingScript = await pushdrop.lock(
      [
        Utils.toArray('1UHRPYnMHPuQ5Tgb3AF8JXqwKkmZVy5hG', 'utf8'),
        UHRHash,
        Utils.toArray(serviceURL, 'utf8'),
        Utils.toArray(String(expiryTime), 'utf8'),
        Utils.toArray(String(fileData.length), 'utf8')
      ],
      [1, 'publishcommitment'],
      '1',
      'self',
      true
    )

    const result = await wallet.createAction({
      description: 'Publish UHRP file commitment',
      outputs: [{
        lockingScript: lockingScript.toHex(),
        satoshis: 1,
        outputDescription: 'UHRP commitment token output',
        basket: 'uhrp_commitments'
      }]
    })

    const tx = Transaction.fromAtomicBEEF(result.tx!)
    const broadcaster = new TopicBroadcaster(['tm_uhrp'], {
      networkPreset: 'mainnet'
    })
    await broadcaster.broadcast(tx)

    console.log('Transaction created and broadcasted:', tx.id('hex'))
    return `${UHRPURL}`
  } catch (error) {
    if (error instanceof WERR_REVIEW_ACTIONS) {
      console.error('[commitmentToken] Wallet threw WERR_REVIEW_ACTIONS:', {
        code: error.code,
        message: error.message
      })
    }
    console.error('Error creating commitment:', error)
    throw error
  }
}
