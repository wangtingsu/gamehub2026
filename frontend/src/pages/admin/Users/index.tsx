import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Input, Modal, Form, Select, Tag, Avatar, message, Popconfirm, Switch, Tooltip } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  CrownOutlined,
  LockOutlined,
  UnlockOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import ActionButtons from '../components/ActionButtons';
import apiService from '../../../api';
import type { User } from '../../../api/types';
import SEO from '../../../components/SEO';

const { Search } = Input;
const { Option } = Select;

// 角色配置
const roleConfig: Record<string, { color: string; label: string; level: number }> = {
  super_admin: { color: 'red', label: '超级管理员', level: 2 },
  admin: { color: 'orange', label: '管理员', level: 1 },
  user: { color: 'green', label: '普通用户', level: 0 },
};

// 状态配置
const statusConfig: Record<string, { color: string; label: string }> = {
  active: { color: 'success', label: '正常' },
  inactive: { color: 'default', label: '停用' },
  suspended: { color: 'error', label: '封禁' },
};

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchText, setSearchText] = useState('');
  const [roleFilter, setRoleFilter] = useState<string | undefined>();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [form] = Form.useForm();
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // 获取当前登录用户
  useEffect(() => {
    const loadCurrentUser = async () => {
      try {
        const user = await apiService.getCurrentUser();
        setCurrentUser(user);
      } catch { /* ignore */ }
    };
    loadCurrentUser();
  }, []);

  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isAdmin = currentUser?.role === 'admin' || isSuperAdmin;

  // 加载用户列表
  const loadUsers = async () => {
    setLoading(true);
    try {
      const result = await apiService.getAdminUsers({
        page,
        limit: pageSize,
        search: searchText || undefined,
        role: roleFilter,
      });
      setUsers(result.users);
      setTotal(result.pagination?.total || 0);
    } catch (error: any) {
      message.error(error.message || '获取用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdmin) loadUsers();
  }, [page, pageSize, roleFilter, isAdmin]);

  // 处理搜索
  const handleSearch = (value: string) => {
    setSearchText(value);
    setPage(1);
  };

  // 查看用户详情
  const handleViewUser = (user: User) => {
    Modal.info({
      title: '用户详情',
      width: 640,
      content: (
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <Avatar size={64} className="bg-primary-500 text-white text-2xl">
              {user.username.charAt(0).toUpperCase()}
            </Avatar>
            <div>
              <h3 className="text-xl font-bold">{user.displayName || user.username}</h3>
              <p className="text-gray-600">@{user.username}</p>
              <p className="text-gray-600">{user.email}</p>
              {user.phone && <p className="text-gray-600">{user.phone}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-sm text-gray-500">角色</div>
              <Tag color={roleConfig[user.role]?.color}>{roleConfig[user.role]?.label}</Tag>
            </div>
            <div className="bg-gray-50 p-3 rounded">
              <div className="text-sm text-gray-500">状态</div>
              <Tag color={user.isActive ? 'success' : 'error'}>{user.isActive ? '正常' : '停用'}</Tag>
            </div>
            <div className="bg-blue-50 p-3 rounded">
              <div className="text-sm text-blue-600">等级</div>
              <div className="text-2xl font-bold text-blue-700">Lv.{user.level}</div>
            </div>
            <div className="bg-purple-50 p-3 rounded">
              <div className="text-sm text-purple-600">累计登录</div>
              <div className="text-2xl font-bold text-purple-700">{Math.round(user.totalLoginTime / 60)}h</div>
            </div>
          </div>

          {user.commentFrozen && (
            <div className="bg-red-50 p-3 rounded flex items-center">
              <LockOutlined className="text-red-500 mr-2" />
              <span className="text-red-600">评论功能已被冻结{user.frozenUntil ? ` 至 ${new Date(user.frozenUntil).toLocaleDateString()}` : ''}</span>
            </div>
          )}

          <div className="text-xs text-gray-400">
            注册时间: {new Date(user.createdAt).toLocaleString()} | 最后登录: {user.updatedAt ? new Date(user.updatedAt).toLocaleString() : '无'}
          </div>
        </div>
      ),
    });
  };

  // 打开编辑模态框
  const handleEditUser = (user: User) => {
    setEditingUser(user);
    form.setFieldsValue({
      ...user,
      status: user.isActive ? 'active' : 'inactive',
    });
    setIsModalVisible(true);
  };

  // 删除用户（仅超级管理员）
  const handleDeleteUser = async (userId: string) => {
    try {
      await apiService.deleteAdminUser(userId);
      message.success('用户已删除');
      loadUsers();
    } catch (error: any) {
      message.error(error.message || '删除失败');
    }
  };

  // 添加新用户
  const handleAddUser = () => {
    setEditingUser(null);
    form.resetFields();
    form.setFieldsValue({ role: 'user', status: 'active' });
    setIsModalVisible(true);
  };

  // 提交表单
  const handleSubmit = async (values: Record<string, any>) => {
    try {
      if (editingUser) {
        await apiService.updateAdminUser(editingUser.id, values);
        message.success('用户更新成功');
      } else {
        await apiService.createAdminUser(values);
        message.success('用户创建成功');
      }
      setIsModalVisible(false);
      loadUsers();
    } catch (error: any) {
      message.error(error.message || '操作失败');
    }
  };

  // 角色变更（仅超级管理员）
  const handleRoleChange = (user: User) => {
    Modal.confirm({
      title: '角色变更',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div style={{ marginTop: 16 }}>
          <p>将 <b>{user.username}</b> 的角色从 <Tag color={roleConfig[user.role]?.color}>{roleConfig[user.role]?.label}</Tag> 变更为：</p>
          <Select
            defaultValue={user.role}
            style={{ width: '100%', marginTop: 8 }}
            onChange={async (newRole) => {
              try {
                await apiService.changeUserRole(user.id, newRole);
                message.success(`角色已变更为 ${roleConfig[newRole]?.label}`);
                loadUsers();
              } catch (error: any) {
                message.error(error.message || '角色变更失败');
              }
            }}
          >
            <Option value="super_admin">超级管理员</Option>
            <Option value="admin">管理员</Option>
            <Option value="user">普通用户</Option>
          </Select>
        </div>
      ),
      okText: '关闭',
      cancelText: '取消',
      onOk: () => {},
    });
  };

  // 冻结/解冻评论（管理员可操作）
  const handleFreezeComment = async (user: User) => {
    if (!user.commentFrozen) {
      // 冻结
      Modal.confirm({
        title: '冻结评论功能',
        content: (
          <div style={{ marginTop: 16 }}>
            <p>确定要冻结 <b>{user.username}</b> 的评论功能吗？</p>
            <p className="text-gray-500 text-sm">冻结后用户仍可正常登录，但无法发表评论。</p>
          </div>
        ),
        onOk: async () => {
          try {
            await apiService.freezeUserComment(user.id, true);
            message.success('评论功能已冻结');
            loadUsers();
          } catch (error: any) {
            message.error(error.message || '操作失败');
          }
        },
      });
    } else {
      // 解冻
      try {
        await apiService.freezeUserComment(user.id, false);
        message.success('评论功能已解冻');
        loadUsers();
      } catch (error: any) {
        message.error(error.message || '操作失败');
      }
    }
  };

  // 表格列定义
  const columns: ColumnsType<User> = [
    {
      title: '用户',
      key: 'user',
      width: 200,
      render: (_, record) => (
        <div className="flex items-center">
          <Avatar size="default" className="mr-3 bg-primary-500">
            {record.username.charAt(0).toUpperCase()}
          </Avatar>
          <div>
            <div className="font-medium flex items-center">
              {record.username}
              {record.commentFrozen && <LockOutlined className="ml-1 text-red-400 text-xs" />}
            </div>
            <div className="text-xs text-gray-500">{record.email}</div>
          </div>
        </div>
      ),
    },
    {
      title: '等级',
      dataIndex: 'level',
      key: 'level',
      width: 80,
      sorter: (a, b) => a.level - b.level,
      render: (level: number) => (
        <Tag icon={<CrownOutlined />} color="gold" className="font-bold">
          Lv.{level}
        </Tag>
      ),
    },
    {
      title: '角色',
      dataIndex: 'role',
      key: 'role',
      width: 120,
      render: (role: string) => {
        const config = roleConfig[role] || { color: 'default', label: role };
        return <Tag color={config.color}>{config.label}</Tag>;
      },
      filters: [
        { text: '超级管理员', value: 'super_admin' },
        { text: '管理员', value: 'admin' },
        { text: '普通用户', value: 'user' },
      ],
      onFilter: (value, record) => record.role === value,
    },
    {
      title: '状态',
      dataIndex: 'isActive',
      key: 'status',
      width: 90,
      render: (isActive: boolean) => (
        <Tag color={isActive ? 'success' : 'error'}>{isActive ? '正常' : '停用'}</Tag>
      ),
    },
    {
      title: '登录时长',
      key: 'loginTime',
      width: 100,
      render: (_, record) => `${Math.round(record.totalLoginTime / 60)}h`,
      sorter: (a, b) => a.totalLoginTime - b.totalLoginTime,
    },
    {
      title: '注册时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 120,
      render: (date: string) => new Date(date).toLocaleDateString(),
      sorter: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="查看详情">
            <Button type="text" icon={<EyeOutlined />} size="small" onClick={() => handleViewUser(record)} />
          </Tooltip>
          {isSuperAdmin && (
            <Tooltip title="角色变更">
              <Button type="text" icon={<CrownOutlined />} size="small" onClick={() => handleRoleChange(record)} />
            </Tooltip>
          )}
          <Tooltip title={record.commentFrozen ? '解冻评论' : '冻结评论'}>
            <Button
              type="text"
              icon={record.commentFrozen ? <UnlockOutlined /> : <LockOutlined />}
              size="small"
              onClick={() => handleFreezeComment(record)}
              className={record.commentFrozen ? 'text-green-500' : 'text-orange-500'}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button type="text" icon={<EditOutlined />} size="small" onClick={() => handleEditUser(record)} />
          </Tooltip>
          {isSuperAdmin && record.role !== 'user' ? (
            <Popconfirm title="确定删除此管理员？" onConfirm={() => handleDeleteUser(record.id)} okText="确定" cancelText="取消">
              <Tooltip title="删除">
                <Button type="text" icon={<DeleteOutlined />} size="small" danger />
              </Tooltip>
            </Popconfirm>
          ) : isAdmin && (
            <Popconfirm title="确定删除此用户？" onConfirm={() => handleDeleteUser(record.id)} okText="确定" cancelText="取消">
              <Tooltip title="删除">
                <Button type="text" icon={<DeleteOutlined />} size="small" danger />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  // 行选择
  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => setSelectedRowKeys(keys),
  };

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) return;
    Modal.confirm({
      title: '批量删除',
      content: `确定要删除 ${selectedRowKeys.length} 个用户吗？此操作不可恢复。`,
      onOk: async () => {
        try {
          await apiService.batchDeleteAdminUsers(selectedRowKeys as string[]);
          message.success(`成功删除 ${selectedRowKeys.length} 个用户`);
          setSelectedRowKeys([]);
          loadUsers();
        } catch (error: any) {
          message.error(error.message || '操作失败');
        }
      },
    });
  };

  return (
    <div className="users-page">
      <SEO title="用户管理 | GameHub" description="管理网站注册用户，查看用户信息和状态" keywords="用户管理, 用户列表, 账户管理, 用户信息, 用户状态" noindex />
      <h1 className="text-2xl font-bold mb-6">用户管理</h1>

      {/* 工具栏 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="flex-1 flex gap-2">
          <Search
            placeholder="搜索用户名、邮箱"
            allowClear
            enterButton={<SearchOutlined />}
            size="large"
            onSearch={handleSearch}
            onChange={(e) => { if (!e.target.value) handleSearch(''); }}
            className="w-full sm:w-auto"
            style={{ maxWidth: 400 }}
          />
          <Select
            placeholder="角色筛选"
            allowClear
            size="large"
            style={{ width: 140 }}
            value={roleFilter}
            onChange={(v) => setRoleFilter(v)}
          >
            <Option value="super_admin">超级管理员</Option>
            <Option value="admin">管理员</Option>
            <Option value="user">普通用户</Option>
          </Select>
        </div>
        <ActionButtons
          onAdd={isAdmin ? handleAddUser : undefined}
          onRefresh={loadUsers}
          showAdd={isAdmin}
        />
      </div>

      {/* 批量操作 */}
      {selectedRowKeys.length > 0 && (
        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <div className="flex items-center justify-between">
            <span className="font-medium text-blue-700">
              已选择 {selectedRowKeys.length} 个用户
            </span>
            <Space>
              {isAdmin && (
                <Popconfirm title="确定删除选中用户？" onConfirm={handleBatchDelete}>
                  <Button danger size="small">删除选中</Button>
                </Popconfirm>
              )}
              <Button type="link" onClick={() => setSelectedRowKeys([])}>清除选择</Button>
            </Space>
          </div>
        </div>
      )}

      {/* 用户表格 */}
      <Table
        columns={columns}
        dataSource={users}
        rowKey="id"
        rowSelection={rowSelection}
        loading={loading}
        scroll={{ x: 900 }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (t) => `共 ${t} 个用户`,
          onChange: (p, ps) => { setPage(p); setPageSize(ps); },
        }}
      />

      {/* 添加/编辑模态框 */}
      <Modal
        title={editingUser ? '编辑用户' : '添加用户'}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={520}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item label="用户名" name="username" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input placeholder="用户名" disabled={!!editingUser} />
          </Form.Item>
          <Form.Item label="邮箱" name="email" rules={editingUser ? [] : [{ required: true, message: '请输入邮箱' }]}>
            <Input placeholder="邮箱" />
          </Form.Item>
          {!editingUser && (
            <Form.Item label="密码" name="password" rules={[{ required: true, message: '请输入密码' }]}>
              <Input.Password placeholder="密码" />
            </Form.Item>
          )}
          <Form.Item label="显示名称" name="displayName">
            <Input placeholder="显示名称" />
          </Form.Item>
          <div className="grid grid-cols-2 gap-4">
            <Form.Item label="角色" name="role" rules={[{ required: true }]}>
              <Select disabled={!isSuperAdmin}>
                {isSuperAdmin && <Option value="super_admin">超级管理员</Option>}
                <Option value="admin">管理员</Option>
                <Option value="user">普通用户</Option>
              </Select>
            </Form.Item>
            <Form.Item label="状态" name="status">
              <Select>
                <Option value="active">正常</Option>
                <Option value="inactive">停用</Option>
              </Select>
            </Form.Item>
          </div>
          <Form.Item className="mb-0">
            <div className="flex justify-end space-x-2">
              <Button onClick={() => setIsModalVisible(false)}>取消</Button>
              <Button type="primary" htmlType="submit">{editingUser ? '更新' : '添加'}</Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Users;
