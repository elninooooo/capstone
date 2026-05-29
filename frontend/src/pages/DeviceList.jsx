import { useState, useEffect } from 'react';
import { Table, Card, Tag, Button, Space, message, Typography, Statistic, Row, Col, Modal, Form, Input, Select } from 'antd';
import { DatabaseOutlined, PlusOutlined, ReloadOutlined, CloudServerOutlined, HddOutlined, AppstoreOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { getDevices, registerDevice } from '../services/api';

const { Title } = Typography;

const typeColors = {
  temperature: 'red',
  humidity: 'blue',
  pressure: 'green',
  sensor: 'orange',
};

export default function DeviceList() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();
  const navigate = useNavigate();

  const fetchDevices = async () => {
    setLoading(true);
    try {
      const res = await getDevices();
      setDevices(res.data.devices || []);
    } catch (err) {
      message.error('Failed to fetch device list: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDevices(); }, []);

  const handleRegister = async (values) => {
    setSubmitting(true);
    try {
      await registerDevice(values);
      message.success('Device registered successfully');
      setModalOpen(false);
      form.resetFields();
      fetchDevices();
    } catch (err) {
      message.error('Registration failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: 'Device ID',
      dataIndex: 'deviceId',
      key: 'deviceId',
      render: (text) => <a onClick={() => navigate(`/records/${text}`)}>{text}</a>,
    },
    {
      title: 'Device Name',
      dataIndex: 'deviceName',
      key: 'deviceName',
    },
    {
      title: 'Device Type',
      dataIndex: 'deviceType',
      key: 'deviceType',
      render: (type) => <Tag color={typeColors[type] || 'default'}>{type}</Tag>,
    },
    {
      title: 'Records',
      dataIndex: 'recordCount',
      key: 'recordCount',
      render: (count) => <Tag color="cyan">{count}</Tag>,
    },
    {
      title: 'Owner',
      dataIndex: 'owner',
      key: 'owner',
      render: (addr) => addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '-',
    },
    {
      title: 'Registered At',
      dataIndex: 'registeredAt',
      key: 'registeredAt',
      render: (ts) => ts ? new Date(ts * 1000).toLocaleString() : '-',
    },
    {
      title: 'Actions',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button type="link" onClick={() => navigate(`/records/${record.deviceId}`)}>
            View Data
          </Button>
          <Button type="link" onClick={() => navigate(`/access/${record.deviceId}`)}>
            Access Control
          </Button>
        </Space>
      ),
    },
  ];

  const totalRecords = devices.reduce((sum, d) => sum + (d.recordCount || 0), 0);

  return (
    <div>
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Card>
            <Statistic title="Total Devices" value={devices.length} prefix={<HddOutlined />} />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="Total Records" value={totalRecords} prefix={<DatabaseOutlined />} />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="Device Types" value={[...new Set(devices.map(d => d.deviceType))].length} prefix={<AppstoreOutlined />} />
          </Card>
        </Col>
      </Row>

      <Card
        title={<><CloudServerOutlined /> IoT Device List</>}
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchDevices}>Refresh</Button>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
              Register Device
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={devices}
          rowKey="deviceId"
          loading={loading}
          pagination={{ pageSize: 10 }}
        />
      </Card>

      <Modal
        title="Register New Device"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        footer={null}
      >
        <Form form={form} layout="vertical" onFinish={handleRegister}>
          <Form.Item name="deviceId" label="Device ID" rules={[{ required: true, message: 'Please enter Device ID' }]}>
            <Input placeholder="e.g. TEMP-001" />
          </Form.Item>
          <Form.Item name="deviceName" label="Device Name" rules={[{ required: true, message: 'Please enter Device Name' }]}>
            <Input placeholder="e.g. Office Temperature Sensor" />
          </Form.Item>
          <Form.Item name="deviceType" label="Device Type" rules={[{ required: true, message: 'Please select Device Type' }]}>
            <Select placeholder="Select Device Type">
              <Select.Option value="temperature">Temperature Sensor</Select.Option>
              <Select.Option value="humidity">Humidity Sensor</Select.Option>
              <Select.Option value="pressure">Pressure Sensor</Select.Option>
              <Select.Option value="sensor">General Sensor</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={submitting} block>
              Register
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
