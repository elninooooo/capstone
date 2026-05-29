import { Typography, Card, Table, Tag, Space, Divider, Alert, Steps, Collapse } from 'antd';
import {
  CloudServerOutlined, UploadOutlined, SafetyCertificateOutlined,
  DatabaseOutlined, CheckCircleOutlined, FileTextOutlined,
  LinkOutlined, InfoCircleOutlined
} from '@ant-design/icons';

const { Title, Paragraph, Text } = Typography;
const { Step } = Steps;
const { Panel } = Collapse;

const csvColumns = [
  { title: '字段名', dataIndex: 'field', key: 'field', width: 160 },
  { title: '类型', dataIndex: 'type', key: 'type', width: 100, render: v => <Tag color="blue">{v}</Tag> },
  { title: '说明', dataIndex: 'desc', key: 'desc' },
  { title: '示例', dataIndex: 'example', key: 'example', render: v => <Text code>{v}</Text> },
];

const csvData = [
  { key: 1, field: 'timestamp', type: 'datetime', desc: '数据采集时间（ISO格式或常见日期格式均可）', example: '2026-03-19 10:00:00' },
  { key: 2, field: 'temperature', type: 'float', desc: '温度读数（℃）', example: '25.3' },
  { key: 3, field: 'humidity', type: 'float', desc: '湿度读数（%）', example: '60.1' },
  { key: 4, field: 'pressure', type: 'float', desc: '气压读数（hPa）', example: '1013.2' },
];

const apiColumns = [
  { title: '接口', dataIndex: 'api', key: 'api', render: v => <Text code>{v}</Text>, width: 260 },
  { title: '方法', dataIndex: 'method', key: 'method', width: 80, render: v => <Tag color={v === 'GET' ? 'green' : 'orange'}>{v}</Tag> },
  { title: '说明', dataIndex: 'desc', key: 'desc' },
];

const apiData = [
  { key: 1, api: 'GET /api/health', method: 'GET', desc: '检查服务状态与区块链连接情况' },
  { key: 2, api: 'GET /api/devices', method: 'GET', desc: '获取所有已注册的 IoT 设备列表' },
  { key: 3, api: 'POST /api/devices', method: 'POST', desc: '注册新设备（deviceId, deviceName, deviceType）' },
  { key: 4, api: 'POST /api/upload', method: 'POST', desc: '上传 CSV/任意文件并写入区块链存证' },
  { key: 5, api: 'GET /api/records?deviceId=xxx', method: 'GET', desc: '查询设备的所有链上数据记录' },
  { key: 6, api: 'GET /api/download?hash=xxx', method: 'GET', desc: '通过 IPFS Hash 下载原始数据文件' },
  { key: 7, api: 'POST /api/verify', method: 'POST', desc: '验证数据完整性（链上哈希对比）' },
  { key: 8, api: 'POST /api/access/grant', method: 'POST', desc: '授权用户访问设备数据' },
  { key: 9, api: 'POST /api/access/revoke', method: 'POST', desc: '撤销用户访问权限' },
  { key: 10, api: 'GET /api/access/check', method: 'GET', desc: '检查某用户是否有访问权限' },
];

const sampleCSV = `timestamp,temperature,humidity,pressure
2026-03-19 10:00:00,25.3,60.1,1013.2
2026-03-19 10:01:00,25.5,59.8,1013.1
2026-03-19 10:02:00,25.4,60.0,1013.3
2026-03-19 10:03:00,25.6,59.5,1013.0
2026-03-19 10:04:00,25.2,60.3,1013.4`;

export default function UserManual() {
  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      {/* 标题区 */}
      <Card style={{ marginBottom: 24, background: 'linear-gradient(135deg, #001529 0%, #003a8c 100%)', border: 'none' }}>
        <Space align="center">
          <LinkOutlined style={{ fontSize: 36, color: '#1677ff' }} />
          <div>
            <Title level={2} style={{ color: '#fff', margin: 0 }}>IoT 区块链数据存证系统</Title>
            <Text style={{ color: '#aaa' }}>使用手册 · User Manual</Text>
          </div>
        </Space>
      </Card>

      {/* 系统概述 */}
      <Card title={<><InfoCircleOutlined style={{ marginRight: 8, color: '#1677ff' }} />系统概述</>} style={{ marginBottom: 24 }}>
        <Paragraph>
          本系统是基于 <Text strong>以太坊智能合约 + IPFS</Text> 的物联网数据安全存证平台，核心解决三个问题：
        </Paragraph>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          {[
            { icon: <UploadOutlined />, color: '#1677ff', title: '可信存证', desc: '数据上传后，哈希值永久记录在区块链上，不可篡改' },
            { icon: <SafetyCertificateOutlined />, color: '#52c41a', title: '完整性校验', desc: '任何时候可验证数据是否被篡改，哈希对比即证明' },
            { icon: <DatabaseOutlined />, color: '#faad14', title: '权限控制', desc: '只有被授权的用户地址才能访问设备数据' },
          ].map((item, i) => (
            <Card key={i} size="small" style={{ textAlign: 'center', borderColor: item.color }}>
              <div style={{ fontSize: 28, color: item.color, marginBottom: 8 }}>{item.icon}</div>
              <Title level={5} style={{ margin: '0 0 4px' }}>{item.title}</Title>
              <Text type="secondary" style={{ fontSize: 12 }}>{item.desc}</Text>
            </Card>
          ))}
        </div>

        <Divider />

        <Title level={5}>系统架构（四层）</Title>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {[
            { layer: '表现层', tech: 'React + Ant Design', color: '#1677ff', port: '5140', desc: '前端界面' },
            { layer: '控制层', tech: 'Python Flask + Web3.py', color: '#52c41a', port: '5141', desc: '后端 API' },
            { layer: '逻辑层', tech: 'Ethereum 智能合约', color: '#faad14', port: '5145', desc: 'Hardhat 节点' },
            { layer: '数据层', tech: 'IPFS / 本地存储', color: '#eb2f96', port: '—', desc: '文件存储' },
          ].map((item, i) => (
            <div key={i} style={{ background: '#fafafa', border: `1px solid ${item.color}30`, borderRadius: 8, padding: 12 }}>
              <Tag color={item.color} style={{ marginBottom: 6 }}>{item.layer}</Tag>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{item.tech}</div>
              <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>端口: {item.port}</div>
              <div style={{ fontSize: 11, color: '#666' }}>{item.desc}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* 上传数据格式 */}
      <Card
        title={<><FileTextOutlined style={{ marginRight: 8, color: '#1677ff' }} />上传数据是什么格式</>}
        style={{ marginBottom: 24 }}
      >
        <Alert
          message="支持上传任意文件（CSV、JSON、二进制等），系统会计算文件 SHA-256 哈希并存入区块链。"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Title level={5}>推荐格式：CSV 传感器数据</Title>
        <Paragraph type="secondary">标准 CSV 格式，第一行为字段名，后续每行一条数据记录。</Paragraph>

        <Table
          columns={csvColumns}
          dataSource={csvData}
          pagination={false}
          size="small"
          style={{ marginBottom: 16 }}
        />

        <Title level={5}>CSV 示例文件内容</Title>
        <div style={{
          background: '#1e1e1e', color: '#d4d4d4', borderRadius: 8, padding: 16,
          fontFamily: 'monospace', fontSize: 13, whiteSpace: 'pre', overflowX: 'auto',
          marginBottom: 16
        }}>
          {sampleCSV}
        </div>

        <Alert
          message={
            <span>
              <Text strong>字段可自定义</Text>：只需第一行是字段名即可。其他类型设备（如振动传感器、光照传感器、GPS等）可自行添加列，系统以文件整体哈希存证，不解析内容。
            </span>
          }
          type="success"
          showIcon
        />
      </Card>

      {/* 操作步骤 */}
      <Card
        title={<><CloudServerOutlined style={{ marginRight: 8, color: '#1677ff' }} />操作步骤</>}
        style={{ marginBottom: 24 }}
      >
        <Steps direction="vertical" current={-1}>
          <Step
            title="注册 IoT 设备"
            description={
              <div style={{ paddingTop: 8 }}>
                <Paragraph>
                  前往 <Text strong>Device Management</Text> 页面，点击 <Tag color="blue">+ Register Device</Tag> 按钮，填写：
                </Paragraph>
                <ul style={{ paddingLeft: 20 }}>
                  <li><Text code>Device ID</Text>：唯一标识符，如 <Text code>sensor_001</Text></li>
                  <li><Text code>Device Name</Text>：设备名称，如 <Text code>温度传感器A栋</Text></li>
                  <li><Text code>Device Type</Text>：设备类型，如 <Text code>temperature</Text></li>
                </ul>
              </div>
            }
          />
          <Step
            title="上传数据文件"
            description={
              <div style={{ paddingTop: 8 }}>
                <Paragraph>
                  点击设备行的 <Tag color="blue">View Data</Tag>，进入数据记录页，点击 <Tag color="green">Upload Data</Tag>，选择 CSV 文件上传。
                </Paragraph>
                <Paragraph type="secondary">
                  系统会自动：① 计算文件 SHA-256 哈希 → ② 存入本地/IPFS → ③ 将哈希写入区块链智能合约
                </Paragraph>
              </div>
            }
          />
          <Step
            title="查看链上记录"
            description={
              <div style={{ paddingTop: 8 }}>
                <Paragraph>
                  数据记录页展示所有链上存证记录，包含：IPFS Hash、上传时间、区块高度、上传者地址。
                </Paragraph>
                <Paragraph>
                  点击 <Tag color="blue">Download</Tag> 可下载原始文件；点击 <Tag color="green">Verify</Tag> 可校验完整性。
                </Paragraph>
              </div>
            }
          />
          <Step
            title="验证数据完整性"
            description={
              <div style={{ paddingTop: 8 }}>
                <Paragraph>
                  点击记录行的 <Tag color="green">Verify</Tag>，系统会：
                </Paragraph>
                <ol style={{ paddingLeft: 20 }}>
                  <li>从存储中取出原始文件</li>
                  <li>重新计算内容哈希</li>
                  <li>与区块链上记录的哈希对比</li>
                  <li>一致 → <Tag color="success" icon={<CheckCircleOutlined />}>验证通过</Tag>，不一致 → 数据已被篡改</li>
                </ol>
              </div>
            }
          />
          <Step
            title="管理访问权限"
            description={
              <div style={{ paddingTop: 8 }}>
                <Paragraph>
                  点击设备行的 <Tag color="orange">Access Control</Tag>，可以：
                </Paragraph>
                <ul style={{ paddingLeft: 20 }}>
                  <li>从下拉列表选择以太坊地址，点击 <Tag color="blue">Grant Access</Tag> 授权</li>
                  <li>在权限列表中点击 <Tag color="red">Revoke</Tag> 撤销访问</li>
                </ul>
                <Paragraph type="secondary">
                  当前可选地址来自区块链节点内置的测试账户（5个 Hardhat 地址）
                </Paragraph>
              </div>
            }
          />
        </Steps>
      </Card>

      {/* API 参考 */}
      <Card
        title={<><DatabaseOutlined style={{ marginRight: 8, color: '#1677ff' }} />后端 API 接口参考（端口 5141）</>}
        style={{ marginBottom: 24 }}
      >
        <Table columns={apiColumns} dataSource={apiData} pagination={false} size="small" />

        <Divider />
        <Title level={5}>使用 curl 上传数据示例</Title>
        <div style={{ background: '#1e1e1e', color: '#d4d4d4', borderRadius: 8, padding: 16, fontFamily: 'monospace', fontSize: 13, whiteSpace: 'pre', overflowX: 'auto' }}>
          {`# 注册设备
curl -X POST http://localhost:5141/api/devices \\
  -H "Content-Type: application/json" \\
  -d '{"deviceId":"sensor_001","deviceName":"温度传感器","deviceType":"temperature"}'

# 上传CSV数据
curl -X POST http://localhost:5141/api/upload \\
  -F "deviceId=sensor_001" \\
  -F "file=@/path/to/sensor_data.csv"

# 查询记录
curl "http://localhost:5141/api/records?deviceId=sensor_001"

# 验证完整性
curl -X POST http://localhost:5141/api/verify \\
  -H "Content-Type: application/json" \\
  -d '{"deviceId":"sensor_001","ipfsHash":"QmXXX..."}'`}
        </div>
      </Card>

      {/* 常见问题 */}
      <Card title={<>❓ 常见问题</>} style={{ marginBottom: 24 }}>
        <Collapse ghost>
          <Panel header="上传什么类型的文件？" key="1">
            <Paragraph>
              系统支持 <Text strong>任意文件格式</Text>（CSV、JSON、XML、二进制等）。推荐使用 CSV 格式的 IoT 传感器采集数据。
              系统只存储文件的哈希值到链上，不解析文件内容。
            </Paragraph>
          </Panel>
          <Panel header="区块链连接断了怎么办？" key="2">
            <Paragraph>
              右上角显示 <Tag color="error">Blockchain Disconnected</Tag> 时，说明后端无法连接区块链节点。
              当前使用本地 JSON 模拟模式，通常不会断连。若出现此情况请重启后端服务：
              <Text code style={{ display: 'block', marginTop: 8 }}>cd 项目根目录 && ./start.sh</Text>
            </Paragraph>
          </Panel>
          <Panel header="数据是真的上链了吗？" key="3">
            <Paragraph>
              当前部署为 <Text strong>本地模拟链</Text>（Hardhat + JSON 文件持久化），数据存储在 <Text code>backend/chain_data.json</Text>。
              如需接入真实以太坊主网/测试网，修改 <Text code>backend/config.py</Text> 中的 <Text code>GANACHE_URL</Text> 配置项即可。
            </Paragraph>
          </Panel>
          <Panel header="IPFS Hash 是什么？" key="4">
            <Paragraph>
              IPFS（星际文件系统）是内容寻址存储，文件内容决定 Hash。系统将文件存入 IPFS/本地后，
              得到形如 <Text code>QmXxx...</Text> 的 Hash，该 Hash 写入区块链作为存证凭证。
              验证时重新计算 Hash 并与链上记录对比，一致则证明数据未被篡改。
            </Paragraph>
          </Panel>
          <Panel header="权限控制是什么意思？" key="5">
            <Paragraph>
              每个设备的数据都有访问控制列表。只有被 <Text strong>管理员授权</Text> 的以太坊地址才能查看/下载该设备的数据。
              当前测试环境默认所有请求以管理员身份发出（<Text code>0xf39F...2266</Text>），
              生产部署时需在前端集成 MetaMask 钱包进行真实身份认证。
            </Paragraph>
          </Panel>
        </Collapse>
      </Card>

      {/* 版本信息 */}
      <Card size="small" style={{ textAlign: 'center', background: '#fafafa' }}>
        <Text type="secondary">
          IoT Blockchain Data Attestation System v1.0 &nbsp;·&nbsp;
          前端: React + Ant Design (5140) &nbsp;·&nbsp;
          后端: Python Flask (5141) &nbsp;·&nbsp;
          区块链: Hardhat (5145)
        </Text>
      </Card>
    </div>
  );
}
