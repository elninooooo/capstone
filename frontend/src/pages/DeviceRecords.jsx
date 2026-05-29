import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Table, Card, Button, Space, Tag, message, Descriptions, Modal, Upload, Spin, Typography, Result } from 'antd';
import { ArrowLeftOutlined, UploadOutlined, DownloadOutlined, SafetyCertificateOutlined, FileTextOutlined, CheckCircleOutlined, CloseCircleOutlined, WarningOutlined, FileExcelOutlined } from '@ant-design/icons';
import { getDevice, getRecords, getDownloadUrl, verifyData, uploadData } from '../services/api';

const { Text } = Typography;

export default function DeviceRecords() {
  const { deviceId } = useParams();
  const navigate = useNavigate();
  const [device, setDevice] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(null);
  const [verifyResult, setVerifyResult] = useState(null);
  const [detailRecord, setDetailRecord] = useState(null);
  const [uploading, setUploading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [devRes, recRes] = await Promise.all([
        getDevice(deviceId),
        getRecords(deviceId),
      ]);
      setDevice(devRes.data);
      setRecords(recRes.data.records || []);
    } catch (err) {
      message.error('Failed to fetch data: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [deviceId]);

  const handleVerify = async (record) => {
    setVerifying(record.ipfsHash);
    try {
      const res = await verifyData({ deviceId, ipfsHash: record.ipfsHash });
      setVerifyResult(res.data);
    } catch (err) {
      message.error('Verification failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setVerifying(null);
    }
  };

  const handleDownloadSample = () => {
    const sampleCSV = [
      'timestamp,temperature,humidity,pressure',
      '2026-03-19 10:00:00,25.3,60.1,1013.2',
      '2026-03-19 10:01:00,25.5,59.8,1013.1',
      '2026-03-19 10:02:00,25.4,60.0,1013.3',
      '2026-03-19 10:03:00,25.6,59.5,1013.0',
      '2026-03-19 10:04:00,25.2,60.3,1013.4',
      '2026-03-19 10:05:00,25.7,59.3,1013.1',
      '2026-03-19 10:06:00,25.9,58.8,1013.0',
      '2026-03-19 10:07:00,26.0,58.5,1012.9',
      '2026-03-19 10:08:00,25.8,59.0,1013.2',
      '2026-03-19 10:09:00,25.6,59.4,1013.3',
    ].join('\n');
    const blob = new Blob([sampleCSV], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sample_sensor_data_${deviceId}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    message.success('示例CSV文件已下载');
  };

  const handleUpload = async (info) => {
    const file = info.file;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('deviceId', deviceId);
      formData.append('file', file);
      await uploadData(formData);
      message.success('Data uploaded and attested successfully');
      fetchData();
    } catch (err) {
      message.error('Upload failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setUploading(false);
    }
  };

  const columns = [
    {
      title: '#',
      key: 'index',
      width: 60,
      render: (_, __, idx) => idx + 1,
    },
    {
      title: 'IPFS Hash',
      dataIndex: 'ipfsHash',
      key: 'ipfsHash',
      render: (hash) => (
        <Text copyable={{ text: hash }} style={{ fontFamily: 'monospace', fontSize: 13 }}>
          {hash.slice(0, 20)}...
        </Text>
      ),
    },
    {
      title: 'Upload Time',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (ts) => new Date(ts * 1000).toLocaleString(),
      sorter: (a, b) => a.timestamp - b.timestamp,
    },
    {
      title: 'Block Number',
      dataIndex: 'blockNumber',
      key: 'blockNumber',
      render: (num) => <Tag color="blue">#{num}</Tag>,
    },
    {
      title: 'Uploader',
      dataIndex: 'uploader',
      key: 'uploader',
      render: (addr) => `${addr.slice(0, 6)}...${addr.slice(-4)}`,
    },
    {
      title: 'Actions',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<FileTextOutlined />}
            onClick={() => setDetailRecord(record)}
          >
            Details
          </Button>
          <Button
            type="link"
            icon={<DownloadOutlined />}
            href={getDownloadUrl(record.ipfsHash)}
          >
            Download
          </Button>
          <Button
            type="link"
            icon={<SafetyCertificateOutlined />}
            loading={verifying === record.ipfsHash}
            onClick={() => handleVerify(record)}
          >
            Verify
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/')} style={{ marginBottom: 16 }}>
        Back to Device List
      </Button>

      {device && (
        <Card style={{ marginBottom: 16 }}>
          <Descriptions title={`Device Info: ${device.deviceName}`} column={3}>
            <Descriptions.Item label="Device ID">{device.deviceId}</Descriptions.Item>
            <Descriptions.Item label="Device Type">
              <Tag color="blue">{device.deviceType}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Records">
              <Tag color="cyan">{device.recordCount}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Owner">
              <Text copyable style={{ fontFamily: 'monospace', fontSize: 12 }}>{device.owner}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Registered At">
              {new Date(device.registeredAt * 1000).toLocaleString()}
            </Descriptions.Item>
          </Descriptions>
        </Card>
      )}

      <Card
        title="Data Upload Records"
        extra={
          <Space>
            <Button
              icon={<FileExcelOutlined />}
              onClick={handleDownloadSample}
              title="下载示例CSV文件，可直接上传使用"
            >
              下载示例CSV
            </Button>
            <Upload
              beforeUpload={() => false}
              showUploadList={false}
              onChange={handleUpload}
            >
              <Button type="primary" icon={<UploadOutlined />} loading={uploading}>
                Upload Data
              </Button>
            </Upload>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={records}
          rowKey="ipfsHash"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title="Data Details — On-Chain Attestation Info"
        open={!!detailRecord}
        onCancel={() => setDetailRecord(null)}
        footer={
          detailRecord && (
            <Space>
              <Button href={getDownloadUrl(detailRecord.ipfsHash)} icon={<DownloadOutlined />}>
                Download Raw Data
              </Button>
              <Button type="primary" icon={<SafetyCertificateOutlined />} onClick={() => { handleVerify(detailRecord); }}>
                Integrity Verification
              </Button>
            </Space>
          )
        }
        width={640}
      >
        {detailRecord && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="IPFS Content Hash">
              <Text copyable style={{ fontFamily: 'monospace' }}>{detailRecord.ipfsHash}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Device ID">{detailRecord.deviceId}</Descriptions.Item>
            <Descriptions.Item label="Upload Time">
              {new Date(detailRecord.timestamp * 1000).toLocaleString()}
            </Descriptions.Item>
            <Descriptions.Item label="Unix Timestamp">{detailRecord.timestamp}</Descriptions.Item>
            <Descriptions.Item label="Block Number">
              <Tag color="blue">#{detailRecord.blockNumber}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Uploader Address">
              <Text copyable style={{ fontFamily: 'monospace', fontSize: 12 }}>{detailRecord.uploader}</Text>
            </Descriptions.Item>
            <Descriptions.Item label="Storage">IPFS Distributed Storage</Descriptions.Item>
            <Descriptions.Item label="Network">Ethereum (Ganache Local Chain)</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>

      <Modal
        title="Data Integrity Verification Result"
        open={!!verifyResult}
        onCancel={() => setVerifyResult(null)}
        footer={<Button onClick={() => setVerifyResult(null)}>Close</Button>}
        width={680}
      >
        {verifyResult && (
          <>
            <Result
              status={verifyResult.verified ? 'success' : 'error'}
              title={verifyResult.verified ? 'Data Integrity Verification Passed' : 'Data Integrity Verification Failed'}
              subTitle={verifyResult.verified
                ? 'The data has not been tampered with. The file content hash matches the on-chain record exactly.'
                : (verifyResult.reason || 'The file content hash does not match the on-chain record. The data may have been tampered with!')
              }
              icon={verifyResult.verified
                ? <CheckCircleOutlined style={{ color: '#52c41a' }} />
                : <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
              }
            />

            {(verifyResult.chainIpfsHash || verifyResult.localIpfsHash) && (
              <div style={{ margin: '0 24px 16px', padding: 16, background: verifyResult.hashMatch ? '#f6ffed' : '#fff2f0', borderRadius: 8, border: `1px solid ${verifyResult.hashMatch ? '#b7eb8f' : '#ffccc7'}` }}>
                <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 14 }}>
                  {verifyResult.hashMatch
                    ? <><CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />Hash Comparison: Match</>
                    : <><WarningOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />Hash Comparison: Mismatch</>
                  }
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '100px 1fr', gap: '8px 12px', fontSize: 13 }}>
                  <Text strong>On-Chain:</Text>
                  <Text copyable code style={{ fontFamily: 'monospace', fontSize: 12, color: '#1677ff' }}>
                    {verifyResult.chainIpfsHash || '-'}
                  </Text>
                  <Text strong>Local:</Text>
                  <Text copyable code style={{ fontFamily: 'monospace', fontSize: 12, color: verifyResult.hashMatch ? '#52c41a' : '#ff4d4f' }}>
                    {verifyResult.localIpfsHash || '-'}
                  </Text>
                </div>
              </div>
            )}

            <Descriptions column={1} bordered size="small" style={{ margin: '0 24px 16px' }}>
              {verifyResult.localSha256 && (
                <Descriptions.Item label="File SHA-256">
                  <Text copyable style={{ fontFamily: 'monospace', fontSize: 12 }}>{verifyResult.localSha256}</Text>
                </Descriptions.Item>
              )}
              {verifyResult.fileSize != null && (
                <Descriptions.Item label="File Size">{verifyResult.fileSize} bytes</Descriptions.Item>
              )}
              {verifyResult.chainRecord?.blockNumber > 0 && (
                <Descriptions.Item label="On-Chain Block Number">
                  <Tag color="blue">#{verifyResult.chainRecord.blockNumber}</Tag>
                </Descriptions.Item>
              )}
              {verifyResult.chainRecord?.timestamp > 0 && (
                <Descriptions.Item label="On-Chain Attestation Time">
                  {new Date(verifyResult.chainRecord.timestamp * 1000).toLocaleString()}
                </Descriptions.Item>
              )}
            </Descriptions>

            {!verifyResult.verified && verifyResult.reason && (
              <div style={{ margin: '0 24px 16px', padding: 12, background: '#fff2f0', borderRadius: 6, border: '1px solid #ffccc7' }}>
                <WarningOutlined style={{ color: '#ff4d4f', marginRight: 8 }} />
                <Text type="danger">{verifyResult.reason}</Text>
              </div>
            )}
          </>
        )}
      </Modal>
    </div>
  );
}
