import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Tag, Space, Typography, ConfigProvider, theme } from 'antd';
import { CloudServerOutlined, SafetyCertificateOutlined, LinkOutlined, BookOutlined } from '@ant-design/icons';
import DeviceList from './pages/DeviceList';
import DeviceRecords from './pages/DeviceRecords';
import AccessManagement from './pages/AccessManagement';
import UserManual from './pages/UserManual';
import { getHealth, getDevices } from './services/api';

const { Header, Content, Footer } = Layout;
const { Title, Text } = Typography;

function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    getHealth()
      .then(res => setConnected(res.data.blockchain_connected))
      .catch(() => setConnected(false));
  }, []);

  const menuItems = [
    { key: '/', icon: <CloudServerOutlined />, label: 'Device Management' },
    { key: '/access', icon: <SafetyCertificateOutlined />, label: 'Access Control' },
    { key: '/manual', icon: <BookOutlined />, label: '使用手册' },
  ];

  const currentKey = location.pathname === '/' ? '/' :
    location.pathname.startsWith('/access') ? '/access' :
    location.pathname.startsWith('/manual') ? '/manual' : '/';

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginRight: 40, cursor: 'pointer' }} onClick={() => navigate('/')}>
          <LinkOutlined style={{ fontSize: 24, color: '#1677ff' }} />
          <Title level={4} style={{ color: '#fff', margin: 0 }}>IoT Blockchain Data Attestation</Title>
        </div>
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[currentKey]}
          items={menuItems}
          onClick={({ key }) => navigate(key)}
          style={{ flex: 1 }}
        />
        <Space>
          {connected
            ? <Tag color="success">Blockchain Connected</Tag>
            : <Tag color="error">Blockchain Disconnected</Tag>
          }
        </Space>
      </Header>
      <Content style={{ padding: '24px', background: '#f5f5f5' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto' }}>
          <Routes>
            <Route path="/" element={<DeviceList />} />
            <Route path="/records/:deviceId" element={<DeviceRecords />} />
            <Route path="/access" element={<AccessPlaceholder />} />
            <Route path="/access/:deviceId" element={<AccessManagement />} />
            <Route path="/manual" element={<UserManual />} />
          </Routes>
        </div>
      </Content>
      <Footer style={{ textAlign: 'center', color: '#999' }}>
        IoT Blockchain Data Attestation System — Powered by Ethereum Smart Contracts + IPFS
      </Footer>
    </Layout>
  );
}

function AccessPlaceholder() {
  const navigate = useNavigate();
  const [devices, setDevices] = useState([]);

  useEffect(() => {
    getDevices().then(res => setDevices(res.data.devices || [])).catch(() => {});
  }, []);

  return (
    <div>
      <Title level={4}><SafetyCertificateOutlined /> Access Control</Title>
      <Text type="secondary" style={{ marginBottom: 16, display: 'block' }}>
        Select a device to manage its data access permissions
      </Text>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16, marginTop: 16 }}>
        {devices.map(d => (
          <div
            key={d.deviceId}
            onClick={() => navigate(`/access/${d.deviceId}`)}
            style={{
              background: '#fff',
              borderRadius: 8,
              padding: 20,
              cursor: 'pointer',
              border: '1px solid #f0f0f0',
              transition: 'box-shadow 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'}
            onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
          >
            <Title level={5} style={{ margin: 0 }}>{d.deviceName}</Title>
            <Text type="secondary">{d.deviceId}</Text>
            <div style={{ marginTop: 8 }}>
              <Tag color="blue">{d.deviceType}</Tag>
              <Tag color="cyan">{d.recordCount} records</Tag>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ConfigProvider
      theme={{
        algorithm: theme.defaultAlgorithm,
        token: {
          colorPrimary: '#1677ff',
          borderRadius: 6,
        },
      }}
    >
      <BrowserRouter>
        <AppLayout />
      </BrowserRouter>
    </ConfigProvider>
  );
}
