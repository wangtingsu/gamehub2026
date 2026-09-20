import React, { useState, useEffect } from 'react';
import { Card, Form, Switch, Button, message, Typography, Spin, Select } from 'antd';
import { SettingOutlined, SaveOutlined } from '@ant-design/icons';
import apiService from '../../../api';
import SEO from '../../../components/SEO';

const { Title } = Typography;

const SystemSettings: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const loadConfigs = async () => {
    setLoading(true);
    try {
      const configs = await apiService.getSystemConfigs();
      const values: Record<string, any> = {};
      configs.forEach((cfg: any) => {
        const val = cfg.config_value;
        if (val === 'true') values[cfg.config_key] = true;
        else if (val === 'false') values[cfg.config_key] = false;
        else if (!isNaN(Number(val)) && val !== '') values[cfg.config_key] = Number(val);
        else values[cfg.config_key] = val;
      });
      form.setFieldsValue(values);
    } catch (error: any) {
      message.error('加载配置失败');
    }
    setLoading(false);
  };

  useEffect(() => { loadConfigs(); }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const values = form.getFieldsValue();
      const configs: Record<string, string> = {};
      Object.entries(values).forEach(([key, value]) => {
        configs[key] = String(value);
      });
      await apiService.batchUpdateSystemConfig(configs);
      message.success('配置保存成功');
    } catch (error: any) {
      message.error(error.message || '保存失败');
    }
    setSaving(false);
  };

  if (loading) return <Spin size="large" className="flex justify-center mt-20" />;

  return (
    <div>
      <SEO title="系统配置 | GameHub" description="管理系统配置参数和功能开关" keywords="系统配置, 网站设置, 系统设置, 功能开关, 配置管理" noindex />
      <Title level={3}><SettingOutlined className="mr-2" />系统配置</Title>

      <Form form={form} layout="vertical">
        <Card title="注册设置" className="mb-4">
          <div className="grid grid-cols-2 gap-4">
            <Form.Item label="邮箱注册" name="registration.email_enabled" valuePropName="checked">
              <Switch />
            </Form.Item>
            <Form.Item label="手机注册" name="registration.phone_enabled" valuePropName="checked">
              <Switch />
            </Form.Item>
          </div>
        </Card>

        <Card title="内容显示" className="mb-4">
          <Form.Item
            label="博客详情头图宽高比"
            name="blog.cover_aspect_ratio"
            extra="宽 / 高，作用于博客/攻略/评测详情页顶部头图，保存后生效"
          >
            <Select
              options={[
                { value: '16/9', label: '16:9（标准视频画幅）' },
                { value: '21/9', label: '21:9（电影画幅，推荐）' },
                { value: '2/1', label: '2:1' },
                { value: '3/1', label: '3:1（横向横幅）' },
                { value: '4/3', label: '4:3（方幅）' },
              ]}
            />
          </Form.Item>
        </Card>

        <div className="flex justify-end">
          <Button
            type="primary"
            icon={<SaveOutlined />}
            onClick={handleSave}
            loading={saving}
            size="large"
          >
            保存配置
          </Button>
        </div>
      </Form>
    </div>
  );
};

export default SystemSettings;
