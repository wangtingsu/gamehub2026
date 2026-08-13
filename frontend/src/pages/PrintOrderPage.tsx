import { useState } from 'react';
import { Card, Form, Input, InputNumber, Select, Button, Typography, Alert, Steps, Result, Tag, Space, Divider } from 'antd';
import { PrinterOutlined, FileAddOutlined, CheckCircleOutlined, InboxOutlined } from '@ant-design/icons';
import SEO from '../components/SEO';
import apiService from '../api';

const { Title, Text, Paragraph } = Typography;

const materialOptions = [
  { value: 'pla', label: 'PLA 普通树脂' },
  { value: 'abs', label: 'ABS 工程塑料' },
  { value: 'resin', label: '光敏树脂' },
  { value: 'petg', label: 'PETG 环保树脂' },
  { value: 'nylon', label: '尼龙' },
];

const PrintOrderPage = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orderResult, setOrderResult] = useState<{
    orderId: string;
    status: string;
    createdAt: string;
  } | null>(null);
  const [queryId, setQueryId] = useState('');
  const [queryResult, setQueryResult] = useState<any>(null);
  const [queryLoading, setQueryLoading] = useState(false);

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      setError(null);

      // If no modelData, use a placeholder for demo
      const modelData = values.modelData || btoa('demo model data');

      const result = await apiService.submitPrintOrder({
        modelData,
        size: values.size || 100,
        material: values.material || 'pla',
        color: values.color || '#ffffff',
        quantity: values.quantity || 1,
      });
      setOrderResult(result);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || '提交订单失败');
    } finally {
      setLoading(false);
    }
  };

  const handleQueryOrder = async () => {
    if (!queryId.trim()) return;
    try {
      setQueryLoading(true);
      const result = await apiService.getPrintOrder(queryId.trim());
      setQueryResult(result);
    } catch (err: any) {
      setQueryResult(null);
      setError(err?.response?.data?.error || err?.message || '查询订单失败');
    } finally {
      setQueryLoading(false);
    }
  };

  const getStatusTag = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'orange',
      processing: 'blue',
      completed: 'green',
      failed: 'red',
    };
    const labels: Record<string, string> = {
      pending: '待处理',
      processing: '打印中',
      completed: '已完成',
      failed: '失败',
    };
    return <Tag color={colors[status] || 'default'}>{labels[status] || status}</Tag>;
  };

  return (
    <div className="bg-dark-900 py-2 px-4">
      <SEO title="3D 打印服务 | GameHub" description="提交 3D 模型进行打印" keywords="3D打印, 模型打印, 打印服务, 3D模型, GameHub打印" noindex />

      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl shadow-lg mb-4">
            <PrinterOutlined className="text-white text-2xl" />
          </div>
          <Title level={1} className="mb-2">3D 打印服务</Title>
          <Text type="secondary">上传您的 3D 模型，我们将为您打印并寄送</Text>
        </div>

        {error && (
          <Alert
            message="操作失败"
            description={error}
            type="error"
            showIcon
            className="mb-6"
            closable
            onClose={() => setError(null)}
          />
        )}

        <Steps
          current={orderResult ? 2 : 0}
          className="mb-8"
          items={[
            { title: '提交模型', icon: <FileAddOutlined /> },
            { title: '确认支付', icon: <InboxOutlined /> },
            { title: '开始打印', icon: <PrinterOutlined /> },
            { title: '完成发货', icon: <CheckCircleOutlined /> },
          ]}
        />

        {orderResult ? (
          <Card className="shadow-xl border-0 rounded-2xl">
            <Result
              status="success"
              title="订单提交成功！"
              subTitle={`订单号: ${orderResult.orderId}`}
              extra={
                <div className="space-y-4">
                  <div className="text-left bg-dark-800 border border-dark-700 rounded-lg">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div><Text type="secondary">订单编号</Text></div>
                      <div><Text code>{orderResult.orderId}</Text></div>
                      <div><Text type="secondary">订单状态</Text></div>
                      <div>{getStatusTag(orderResult.status)}</div>
                      <div><Text type="secondary">创建时间</Text></div>
                      <div>{new Date(orderResult.createdAt).toLocaleString()}</div>
                    </div>
                  </div>
                  <Button type="primary" onClick={() => setOrderResult(null)}>
                    继续提交新订单
                  </Button>
                </div>
              }
            />
          </Card>
        ) : (
          <>
            <Card className="shadow-xl border-0 rounded-2xl mb-6">
              <Title level={4} className="mb-6">提交打印订单</Title>
              <Form
                form={form}
                layout="vertical"
                onFinish={handleSubmit}
                size="large"
                initialValues={{
                  size: 100,
                  material: 'pla',
                  color: '#ffffff',
                  quantity: 1,
                }}
              >
                <Form.Item
                  name="modelData"
                  label="模型数据 (Base64 STL)"
                  rules={[{ required: false }]}
                >
                  <Input.TextArea
                    rows={4}
                    placeholder="粘贴 Base64 编码的 STL 模型数据，或留空使用示例模型"
                  />
                </Form.Item>

                <div className="grid grid-cols-2 gap-4">
                  <Form.Item
                    name="size"
                    label="尺寸 (mm)"
                    rules={[{ required: true, message: '请输入尺寸' }]}
                  >
                    <InputNumber min={10} max={500} className="w-full" addonAfter="mm" />
                  </Form.Item>

                  <Form.Item
                    name="quantity"
                    label="数量"
                    rules={[{ required: true, message: '请输入数量' }]}
                  >
                    <InputNumber min={1} max={100} className="w-full" />
                  </Form.Item>

                  <Form.Item
                    name="material"
                    label="材料"
                    rules={[{ required: true, message: '请选择材料' }]}
                  >
                    <Select options={materialOptions} />
                  </Form.Item>

                  <Form.Item
                    name="color"
                    label="颜色"
                    rules={[{ required: true, message: '请选择颜色' }]}
                  >
                    <input
                      type="color"
                      className="w-full h-10 rounded border cursor-pointer"
                    />
                  </Form.Item>
                </div>

                <Form.Item className="mb-0">
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    size="large"
                    block
                    icon={<PrinterOutlined />}
                  >
                    提交打印订单
                  </Button>
                </Form.Item>
              </Form>
            </Card>

            <Card className="shadow-xl border border-dark-700 rounded-2xl bg-dark-800">
              <Title level={4} className="mb-4">查询订单状态</Title>
              <Space.Compact style={{ width: '100%' }}>
                <Input
                  value={queryId}
                  onChange={(e) => setQueryId(e.target.value)}
                  placeholder="输入订单编号"
                  onPressEnter={handleQueryOrder}
                />
                <Button type="primary" onClick={handleQueryOrder} loading={queryLoading}>
                  查询
                </Button>
              </Space.Compact>

              {queryResult && (
                <div className="mt-4 bg-dark-800 border border-dark-700 rounded-lg">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><Text type="secondary">订单编号</Text></div>
                    <div><Text code>{queryResult.id}</Text></div>
                    <div><Text type="secondary">状态</Text></div>
                    <div>{getStatusTag(queryResult.status)}</div>
                    <div><Text type="secondary">材料</Text></div>
                    <div>{materialOptions.find(m => m.value === queryResult.material)?.label || queryResult.material}</div>
                    <div><Text type="secondary">尺寸</Text></div>
                    <div>{queryResult.size}mm</div>
                    <div><Text type="secondary">颜色</Text></div>
                    <div>
                      <span className="inline-block w-4 h-4 rounded align-middle mr-1" style={{ backgroundColor: queryResult.color }} />
                      {queryResult.color}
                    </div>
                    <div><Text type="secondary">数量</Text></div>
                    <div>{queryResult.quantity}</div>
                    <div><Text type="secondary">创建时间</Text></div>
                    <div>{new Date(queryResult.createdAt).toLocaleString()}</div>
                  </div>
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default PrintOrderPage;
