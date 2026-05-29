import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Space, Tag, message, Form, Select, Input, Table, Descriptions, Typography, Popconfirm, Result } from 'antd';
import { ArrowLeftOutlined, UserAddOutlined, DeleteOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { getDevice, getAccounts, grantAccess, revokeAccess, checkAccess } from '../services/api';

const { Text } = Typography;

export default function AccessManagement() {
  const { deviceId } = useParams();
  const navigate = useNavigate();
  const [device, setDevice] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [adminAccount, setAdminAccount] = useState('');
  const [accessList, setAccessList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [devRes, accRes] = await Promise.all([
        getDevice(deviceId),
        getAccounts(),
      ]);
      setDevice(devRes.data);
      const accs = accRes.data.accounts || [];
      setAccounts(accs);
      setAdminAccount(accRes.data.admin || '');

      const admin = accRes.data.admin;
      const nonAdminAccounts = accs.filter(a => a.toLowerCase() !== admin.toLowerCase());
      const checks = await Promise.all(
        nonAdminAccounts.map(async (addr) => {
          try {
            const res = await checkAccess(addr, deviceId);
            return { address: addr, hasAccess: res.data.hasAccess };
          } catch {
            return { address: addr, hasAccess: false };
          }
        })
      );
      setAccessList(checks);
    } catch (err) {
      message.error('Failed to fetch data: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [deviceId]);

  const handleGrant = async (values) => {
    setSubmitting(true);
    try {
      await grantAccess({ userAddress: values.userAddress, deviceId });
      message.success('Access granted successfully');
      form.resetFields();
      fetchData();
    } catch (err) {
      message.error('Authorization failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (userAddress) => {
    try {
      await revokeAccess({ userAddress, deviceId });
      message.success('Access revoked successfully');
      fetchData();
    } catch (err) {
      message.error('Revocation failed: ' + (err.response?.data?.error || err.message));
    }
  };

  const columns = [
    {
      title: 'User Address',
      dataIndex: 'address',
      key: 'address',
      render: (addr) => (
        <Text copyable style={{ fontFamily: 'monospace', fontSize: 12 }}>{addr}</Text>
      ),
    },
    {
      title: 'Permission Status',
      dataIndex: 'hasAccess',
      key: 'hasAccess',
      width: 120,
      render: (has) => has
        ? <Tag icon={<CheckCircleOutlined />} color="success">Authorized</Tag>
        : <Tag icon={<CloseCircleOutlined />} color="default">Unauthorized</Tag>,
    },
    {
      title: 'Actions',
      key: 'action',
      width: 200,
      render: (_, record) => (
        <Space>
          {record.hasAccess ? (
            <Popconfirm
              title="Revoke this user's access permission?"
              onConfirm={() => handleRevoke(record.address)}
              okText="Confirm"
              cancelText="Cancel"
            >
              <Button danger icon={<DeleteOutlined />} size="small">
                Revoke Access
              </Button>
            </Popconfirm>
          ) : (
            <Button
              type="primary"
              icon={<UserAddOutlined />}
              size="small"
              onClick={() => form.setFieldsValue({ userAddress: record.address })}
            >
              Grant Access
            </Button>
          )}
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
          <Descriptions title={`Access Control: ${device.deviceName} (${deviceId})`} column={2}>
            <Descriptions.Item label="Device Type">
              <Tag color="blue">{device.deviceType}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Admin Address">
              <Text copyable style={{ fontFamily: 'monospace', fontSize: 12 }}>{adminAccount}</Text>
            </Descriptions.Item>
          </Descriptions>
        </Card>
      )}

      <Card title="Authorize New User" style={{ marginBottom: 16 }}>
        <Form form={form} layout="inline" onFinish={handleGrant}>
          <Form.Item name="userAddress" rules={[{ required: true, message: 'Please select or enter a user address' }]} style={{ flex: 1 }}>
            <Select
              placeholder="Select user address"
              showSearch
              allowClear
              options={accounts
                .filter(a => a.toLowerCase() !== adminAccount.toLowerCase())
                .map(a => ({ label: `${a.slice(0, 10)}...${a.slice(-6)}`, value: a }))}
              popupRender={(menu) => (
                <>
                  {menu}
                  <div style={{ padding: '4px 8px', fontSize: 12, color: '#999' }}>
                    You can also paste an Ethereum address directly
                  </div>
                </>
              )}
            />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<UserAddOutlined />} loading={submitting}>
              Grant Access
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card title="User Permission List">
        <Table
          columns={columns}
          dataSource={accessList}
          rowKey="address"
          loading={loading}
          pagination={false}
        />
      </Card>
    </div>
  );
}
