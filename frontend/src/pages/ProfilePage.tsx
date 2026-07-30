import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Form,
  Input,
  Button,
  Card,
  Alert,
  Typography,
  Divider,
  Avatar,
  Upload,
  message,
  Descriptions,
  Row,
  Col,
  Space,
  Tabs,
  List,
  Tag,
  Spin,
  Empty,
  Progress,
} from 'antd';
import {
  UserOutlined,
  MailOutlined,
  EditOutlined,
  SaveOutlined,
  CameraOutlined,
  LockOutlined,
  HistoryOutlined,
  TeamOutlined,
  UserAddOutlined,
  UsergroupAddOutlined,
  MessageOutlined,
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import type { FollowUser } from '../api/types';
import SEO from '../components/SEO';
import apiClient from '../api/client';
import TwoFactorSetup from '../components/TwoFactorSetup';
import {
  useGamificationStats,
  useFollowStats,
  useFollowers,
  useFollowing,
  useFollowUser,
  useUnfollowUser,
} from '../api/hooks';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { TabPane } = Tabs;

const ProfilePage = () => {
  const [form] = Form.useForm();
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<UploadFile | null>(null);

  // 关注相关状态
  const [followPage, setFollowPage] = useState(1);
  const [followTab, setFollowTab] = useState<'followers' | 'following'>('followers');

  const navigate = useNavigate();
  const { lang: paramLang } = useParams<{ lang?: string }>();
  const lang = paramLang || 'cn';
  const { user, isAuthenticated, logout } = useAuth();
  const { data: gamificationStats } = useGamificationStats();
  const { data: followStats } = useFollowStats(user?.id ? String(user.id) : undefined);
  const { data: followersData, isLoading: followersLoading } = useFollowers(
    user?.id ? String(user.id) : '',
    { page: followTab === 'followers' ? followPage : 1, limit: 20 },
  );
  const { data: followingData, isLoading: followingLoading } = useFollowing(
    user?.id ? String(user.id) : '',
    { page: followTab === 'following' ? followPage : 1, limit: 20 },
  );
  const followMutation = useFollowUser();
  const unfollowMutation = useUnfollowUser();

  // 如果未登录，重定向到登录页
  useEffect(() => {
    if (!isAuthenticated) {
      navigate(`/${lang}/login`, { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // 当用户信息更新时，更新表单
  useEffect(() => {
    if (user) {
      form.setFieldsValue({
        displayName: user.displayName || user.username,
        email: user.email,
        bio: (user as any).bio || '',
      });
    }
  }, [user, form]);

  // 关注/取消关注用户
  const handleToggleFollow = async (targetUserId: string, isCurrentlyFollowing: boolean) => {
    try {
      if (isCurrentlyFollowing) {
        await unfollowMutation.mutateAsync(targetUserId);
      } else {
        await followMutation.mutateAsync(targetUserId);
      }
      message.success(isCurrentlyFollowing ? '已取消关注' : '关注成功');
    } catch {
      message.error('操作失败，请稍后重试');
    }
  };

  // 发送私信
  const handleSendMessage = (targetUserId: string) => {
    navigate(`/messages?userId=${targetUserId}`);
  };

  // 上传头像处理
  const uploadProps: UploadProps = {
    name: 'avatar',
    accept: 'image/*',
    showUploadList: false,
    beforeUpload: (file) => {
      const isImage = file.type.startsWith('image/');
      if (!isImage) {
        message.error('只能上传图片文件');
        return false;
      }

      const isLt5M = file.size / 1024 / 1024 < 5;
      if (!isLt5M) {
        message.error('图片大小不能超过5MB');
        return false;
      }

      // 预览图片
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarFile({
          uid: file.uid,
          name: file.name,
          status: 'done',
          url: e.target?.result as string,
        });
      };
      reader.readAsDataURL(file);

      // 阻止自动上传
      return false;
    },
  };

  // 相对时间显示辅助函数
  const getRelativeTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return '今天';
    if (diffDays === 1) return '昨天';
    if (diffDays < 7) return `${diffDays}天前`;
    return date.toLocaleDateString();
  };

  const handleSaveProfile = async (values: {
    displayName: string;
    bio: string;
  }) => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);

      await apiClient.put('/auth/me', {
        displayName: values.displayName,
        bio: values.bio,
      });

      setSuccess('个人资料已更新');
      setIsEditing(false);

      // 3秒后清除成功消息
      setTimeout(() => {
        setSuccess(null);
      }, 3000);

    } catch (err) {
      console.error('更新个人资料失败:', err);
      const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                          (err as Error)?.message ||
                          '更新失败，请稍后重试';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangePassword = async (values: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => {
    try {
      setIsLoading(true);
      setError(null);
      setSuccess(null);

      if (values.newPassword !== values.confirmPassword) {
        throw new Error('两次输入的新密码不一致');
      }

      await apiClient.post('/auth/change-password', {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });

      setSuccess('密码修改成功');

      // 3秒后清除成功消息
      setTimeout(() => {
        setSuccess(null);
      }, 3000);

    } catch (err) {
      console.error('修改密码失败:', err);
      const errorMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
                          (err as Error)?.message ||
                          '修改密码失败，请稍后重试';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 p-4 profile-page">
      <SEO
        title="个人资料 | GameHub"
        description="管理您的 GameHub 账户信息和设置"
        keywords="个人资料, 账户设置, GameHub账户, 用户信息, 个人设置"
        noindex
      />
      <div className="">
        {/* 页面标题 */}
        <div className="mb-8">
          <Title level={1} className="!text-white">个人资料</Title>
          <Text className="text-gray-300 text-lg">管理您的账户信息和设置</Text>
        </div>

        <Row gutter={[24, 24]}>
          {/* 左侧：个人信息卡片 */}
          <Col xs={24} md={8}>
            <Card className="shadow-lg border border-dark-700 rounded-2xl bg-dark-800">
              <div className="text-center">
                <div className="relative inline-block mb-4">
                  <Avatar
                    size={120}
                    src={avatarFile?.url || user.avatarUrl}
                    icon={!user.avatarUrl && <UserOutlined />}
                    className="border-4 border-dark-700 shadow-lg"
                  />
                  {isEditing && (
                    <Upload {...uploadProps} className="absolute bottom-0 right-0">
                      <Button
                        type="primary"
                        shape="circle"
                        icon={<CameraOutlined />}
                        size="small"
                        className="shadow-lg"
                      />
                    </Upload>
                  )}
                </div>

                <Title level={3} className="mb-1 !text-white">
                  {user.displayName || user.username}
                </Title>
                <Text className="text-gray-400 mb-4 block text-base">
                  @{user.username}
                </Text>

                <Descriptions column={1} size="small" className="text-left">
                  <Descriptions.Item label="等级">
                    <span className="text-lg font-bold text-yellow-600">Lv.{user.level || 1}</span>
                    <span className="text-xs text-gray-400 ml-1">({Math.round((user.totalLoginTime || 0) / 60)}h)</span>
                    {gamificationStats && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs mb-1">
                          <span>经验值: {gamificationStats.currentXp}</span>
                          <span>下一级: {gamificationStats.nextLevelXp}</span>
                        </div>
                        <Progress
                          percent={Math.round(gamificationStats.progress * 100)}
                          size="small"
                          strokeColor="#f59e0b"
                          showInfo={false}
                        />
                        <div className="flex justify-between text-xs text-gray-400 mt-1">
                          <span>今日 +{gamificationStats.xpToday} XP</span>
                          <span>积分: {gamificationStats.totalPoints}</span>
                        </div>
                      </div>
                    )}
                  </Descriptions.Item>
                  <Descriptions.Item label="角色">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      user.role === 'super_admin' ? 'bg-red-900/30 text-red-400' :
                      user.role === 'admin' ? 'bg-orange-900/30 text-orange-400' :
                      'bg-dark-700 text-gray-300'
                    }`}>
                      {user.role === 'super_admin' ? '超级管理员' :
                       user.role === 'admin' ? '管理员' : '普通用户'}
                    </span>
                  </Descriptions.Item>
                  <Descriptions.Item label="邮箱">{user.email}</Descriptions.Item>
                  <Descriptions.Item label="注册时间">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '未知'}
                  </Descriptions.Item>
                </Descriptions>

                <Divider />

                <Space direction="vertical" className="w-full">
                  {!isEditing ? (
                    <Button
                      type="primary"
                      icon={<EditOutlined />}
                      className="w-full"
                      onClick={() => setIsEditing(true)}
                    >
                      编辑资料
                    </Button>
                  ) : (
                    <>
                      <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        className="w-full"
                        onClick={() => form.submit()}
                        loading={isLoading}
                      >
                        保存修改
                      </Button>
                      <Button
                        className="w-full"
                        onClick={() => {
                          setIsEditing(false);
                          setError(null);
                          setSuccess(null);
                        }}
                      >
                        取消
                      </Button>
                    </>
                  )}
                  <Button
                    type="default"
                    icon={<LockOutlined />}
                    className="w-full"
                    onClick={() => navigate('/change-password')}
                  >
                    修改密码
                  </Button>
                  <Button
                    danger
                    className="w-full"
                    onClick={() => {
                      logout();
                      navigate(`/${lang}/login`);
                    }}
                  >
                    退出登录
                  </Button>
                </Space>
              </div>
            </Card>

            {/* 统计信息卡片 */}
            <Card className="shadow-lg border border-dark-700 rounded-2xl bg-dark-800 mt-6">
              <Title level={4} className="mb-4 !text-white">活动统计</Title>
              <Space direction="vertical" className="w-full">
                <div className="flex justify-between items-center">
                  <Text className="text-gray-300">发表的评测</Text>
                  <Text strong className="text-white">{user.reviewCount ?? 0}</Text>
                </div>
                <div className="flex justify-between items-center">
                  <Text className="text-gray-300">发表的评论</Text>
                  <Text strong className="text-white">{user.commentCount ?? 0}</Text>
                </div>
                <div className="flex justify-between items-center">
                  <Text className="text-gray-300">收藏的游戏</Text>
                  <Text strong className="text-white">{user.favoriteCount ?? 0}</Text>
                </div>
                <div className="flex justify-between items-center">
                  <Text className="text-gray-300">粉丝</Text>
                  <Text strong className="text-white">{followStats?.followersCount ?? 0}</Text>
                </div>
                <div className="flex justify-between items-center">
                  <Text className="text-gray-300">关注</Text>
                  <Text strong className="text-white">{followStats?.followingCount ?? 0}</Text>
                </div>
                <div className="flex justify-between items-center">
                  <Text className="text-gray-300">最后活动</Text>
                  <Text strong className="text-white">{user.updatedAt ? getRelativeTime(user.updatedAt) : '未知'}</Text>
                </div>
              </Space>
            </Card>
          </Col>

          {/* 右侧：详细信息 */}
          <Col xs={24} md={16}>
            <Card className="shadow-lg border border-dark-700 rounded-2xl bg-dark-800">
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

              {success && (
                <Alert
                  message="操作成功"
                  description={success}
                  type="success"
                  showIcon
                  className="mb-6"
                  closable
                  onClose={() => setSuccess(null)}
                />
              )}

              <Tabs defaultActiveKey="profile">
                <TabPane tab="个人资料" key="profile">
                  <Form
                    form={form}
                    name="profile"
                    layout="vertical"
                    onFinish={handleSaveProfile}
                    size="large"
                  >
                    <Row gutter={[24, 16]}>
                      <Col span={24}>
                        <Form.Item
                          name="displayName"
                          label="显示名称"
                          rules={[
                            { required: true, message: '请输入显示名称' },
                            { min: 2, max: 30, message: '显示名称长度应为2-30个字符' },
                          ]}
                        >
                          <Input
                            prefix={<UserOutlined className="text-gray-400" />}
                            placeholder="请输入显示名称"
                            disabled={!isEditing}
                          />
                        </Form.Item>
                      </Col>

                      <Col span={24}>
                        <Form.Item
                          name="email"
                          label="邮箱地址"
                        >
                          <Input
                            prefix={<MailOutlined className="text-gray-400" />}
                            disabled
                          />
                        </Form.Item>
                      </Col>

                      <Col span={24}>
                        <Form.Item
                          name="bio"
                          label="个人简介"
                          rules={[
                            { max: 500, message: '个人简介不能超过500个字符' },
                          ]}
                        >
                          <TextArea
                            rows={4}
                            placeholder="介绍一下你自己..."
                            disabled={!isEditing}
                            maxLength={500}
                            showCount
                          />
                        </Form.Item>
                      </Col>
                    </Row>
                  </Form>
                </TabPane>

                <TabPane tab="安全设置" key="security">
                  <div className="mb-6">
                    <TwoFactorSetup />
                  </div>
                  <div className="border-t border-dark-700 pt-6">
                  <Form
                    name="password"
                    layout="vertical"
                    onFinish={handleChangePassword}
                    size="large"
                  >
                    <Row gutter={[24, 16]}>
                      <Col span={24}>
                        <Form.Item
                          name="currentPassword"
                          label="当前密码"
                          rules={[
                            { required: true, message: '请输入当前密码' },
                          ]}
                        >
                          <Input.Password
                            prefix={<LockOutlined className="text-gray-400" />}
                            placeholder="请输入当前密码"
                          />
                        </Form.Item>
                      </Col>

                      <Col span={24}>
                        <Form.Item
                          name="newPassword"
                          label="新密码"
                          rules={[
                            { required: true, message: '请输入新密码' },
                            { min: 6, message: '密码至少6个字符' },
                            { pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, message: '密码必须包含大小写字母和数字' },
                          ]}
                        >
                          <Input.Password
                            prefix={<LockOutlined className="text-gray-400" />}
                            placeholder="请输入新密码"
                          />
                        </Form.Item>
                      </Col>

                      <Col span={24}>
                        <Form.Item
                          name="confirmPassword"
                          label="确认新密码"
                          dependencies={['newPassword']}
                          rules={[
                            { required: true, message: '请再次输入新密码' },
                            ({ getFieldValue }) => ({
                              validator(_, value) {
                                if (!value || getFieldValue('newPassword') === value) {
                                  return Promise.resolve();
                                }
                                return Promise.reject(new Error('两次输入的密码不一致'));
                              },
                            }),
                          ]}
                        >
                          <Input.Password
                            prefix={<LockOutlined className="text-gray-400" />}
                            placeholder="请再次输入新密码"
                          />
                        </Form.Item>
                      </Col>

                      <Col span={24}>
                        <Button
                          type="primary"
                          htmlType="submit"
                          loading={isLoading}
                          className="w-full h-12"
                        >
                          修改密码
                        </Button>
                      </Col>
                    </Row>
                  </Form>
                  </div>
                </TabPane>

                <TabPane tab="活动记录" key="activity">
                  <div className="text-center py-12">
                    <HistoryOutlined className="text-4xl text-gray-500 mb-4" />
                    <Title level={4} className="text-gray-400">暂无活动记录</Title>
                    <Text className="text-gray-500">您还没有任何活动记录</Text>
                  </div>
                </TabPane>

                <TabPane
                  tab={<span><TeamOutlined /> 社交</span>}
                  key="social"
                >
                  <div className="mb-4">
                    <Space>
                      <Button
                        type={followTab === 'followers' ? 'primary' : 'default'}
                        onClick={() => { setFollowTab('followers'); setFollowPage(1); }}
                      >
                        <TeamOutlined /> 粉丝 {followStats?.followersCount ?? 0}
                      </Button>
                      <Button
                        type={followTab === 'following' ? 'primary' : 'default'}
                        onClick={() => { setFollowTab('following'); setFollowPage(1); }}
                      >
                        <UserAddOutlined /> 关注 {followStats?.followingCount ?? 0}
                      </Button>
                    </Space>
                  </div>

                  {followTab === 'followers' ? (
                    <Spin spinning={followersLoading}>
                      {!followersData?.followers?.length ? (
                        <Empty description="暂无粉丝" />
                      ) : (
                        <List
                          dataSource={followersData.followers}
                          renderItem={(item: FollowUser) => (
                            <List.Item
                              actions={[
                                <Button
                                  key="follow"
                                  size="small"
                                  icon={<UsergroupAddOutlined />}
                                  disabled
                                >
                                  已关注
                                </Button>,
                                <Button
                                  key="message"
                                  size="small"
                                  icon={<MessageOutlined />}
                                  onClick={() => handleSendMessage(item.id)}
                                >
                                  发私信
                                </Button>,
                              ]}
                            >
                              <List.Item.Meta
                                avatar={<Avatar src={item.avatarUrl} icon={<UserOutlined />} />}
                                title={item.displayName}
                                description={
                                  <Space>
                                    <Text type="secondary">@{item.username}</Text>
                                    {item.followedAt && (
                                      <Tag color="blue">关注于 {new Date(item.followedAt).toLocaleDateString()}</Tag>
                                    )}
                                  </Space>
                                }
                              />
                            </List.Item>
                          )}
                          pagination={{
                            current: followPage,
                            pageSize: 20,
                            total: followersData?.pagination?.total || 0,
                            onChange: (p) => setFollowPage(p),
                            showTotal: (t) => `共 ${t} 条`,
                            size: 'small',
                          }}
                        />
                      )}
                    </Spin>
                  ) : (
                    <Spin spinning={followingLoading}>
                      {!followingData?.following?.length ? (
                        <Empty description="暂无关注" />
                      ) : (
                        <List
                          dataSource={followingData.following}
                          renderItem={(item: FollowUser) => (
                            <List.Item
                              actions={[
                                <Button
                                  key="unfollow"
                                  size="small"
                                  danger
                                  onClick={() => handleToggleFollow(item.id, true)}
                                >
                                  取消关注
                                </Button>,
                                <Button
                                  key="message"
                                  size="small"
                                  icon={<MessageOutlined />}
                                  onClick={() => handleSendMessage(item.id)}
                                >
                                  发私信
                                </Button>,
                              ]}
                            >
                              <List.Item.Meta
                                avatar={<Avatar src={item.avatarUrl} icon={<UserOutlined />} />}
                                title={item.displayName}
                                description={
                                  <Space>
                                    <Text type="secondary">@{item.username}</Text>
                                    {item.followedAt && (
                                      <Tag color="green">关注于 {new Date(item.followedAt).toLocaleDateString()}</Tag>
                                    )}
                                  </Space>
                                }
                              />
                            </List.Item>
                          )}
                          pagination={{
                            current: followPage,
                            pageSize: 20,
                            total: followingData?.pagination?.total || 0,
                            onChange: (p) => setFollowPage(p),
                            showTotal: (t) => `共 ${t} 条`,
                            size: 'small',
                          }}
                        />
                      )}
                    </Spin>
                  )}
                </TabPane>
              </Tabs>
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  );
};

// 加载组件
const LoadingSpinner = () => (
  <div className="flex justify-center items-center h-64">
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
  </div>
);

export default ProfilePage;