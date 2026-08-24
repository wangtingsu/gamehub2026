import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Input, Modal, Form, Tag, Image, message, Popconfirm, Rate, Switch, Spin, Select } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  SearchOutlined,
  FilterOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  UploadOutlined,
  DownloadOutlined,
  ThunderboltOutlined,
  DollarOutlined,
  RocketOutlined,
} from '@ant-design/icons';
import ActionButtons from '../components/ActionButtons';
import { apiService } from '../../../api';
import type { Game } from '../../../api/types';
import SEO from '../../../components/SEO';

const { Search } = Input;
const { TextArea } = Input;
const { Option } = Select;

const DISPLAY_ZONE_MAP: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  recommended: { label: '推荐游戏', icon: <ThunderboltOutlined />, color: 'gold' },
  'top-up': { label: '直充游戏', icon: <DollarOutlined />, color: 'green' },
  indie: { label: '独立游戏', icon: <RocketOutlined />, color: 'purple' },
};

const Games: React.FC = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [filteredGames, setFilteredGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [searchText, setSearchText] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [form] = Form.useForm();

  // 加载游戏列表
  useEffect(() => {
    fetchGames();
  }, []);

  const fetchGames = async () => {
    try {
      setLoading(true);
      const data = await apiService.getGames({ limit: 200 });
      setGames(data);
      setFilteredGames(data);
    } catch (err) {
      console.error('获取游戏列表失败:', err);
      message.error('获取游戏列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 表格列定义
  const columns: ColumnsType<Game> = [
    {
      title: 'Game',
      dataIndex: 'title',
      key: 'game',
      render: (text: string, record: Game) => (
        <div className="flex items-center">
          <Image
            src={record.imageUrl}
            alt={text}
            width={60}
            height={40}
            className="rounded object-cover mr-3"
            preview={false}
          />
          <div>
            <div className="font-medium">{text}</div>
            <div className="text-xs text-gray-500">{record.developer}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Release Date',
      dataIndex: 'releaseDate',
      key: 'releaseDate',
      sorter: (a, b) => new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime(),
    },
    {
      title: 'Genres',
      dataIndex: 'genres',
      key: 'genres',
      render: (genres: string[]) => (
        <Space size={[0, 8]} wrap>
          {genres.slice(0, 2).map((genre) => (
            <Tag key={genre} color="blue">
              {genre}
            </Tag>
          ))}
          {genres.length > 2 && <Tag>+{genres.length - 2}</Tag>}
        </Space>
      ),
      filters: [
        { text: 'RPG', value: '角色扮演' },
        { text: 'Action', value: '动作' },
        { text: 'Adventure', value: '冒险' },
        { text: 'Sci-Fi', value: '科幻' },
        { text: 'Fantasy', value: '奇幻' },
      ],
      onFilter: (value, record) => record.genres.includes(value as string),
    },
    {
      title: 'Platforms',
      dataIndex: 'platforms',
      key: 'platforms',
      render: (platforms: string[]) => (
        <Space size={[0, 8]} wrap>
          {platforms.map((platform) => (
            <Tag key={platform} color="green">
              {platform}
            </Tag>
          ))}
        </Space>
      ),
      filters: [
        { text: 'PC', value: 'PC' },
        { text: 'PlayStation', value: 'PlayStation' },
        { text: 'Xbox', value: 'Xbox' },
        { text: 'Switch', value: 'Switch' },
      ],
      onFilter: (value, record) => record.platforms.includes(value as string),
    },
    {
      title: 'Rating',
      dataIndex: 'rating',
      key: 'rating',
      render: (rating: number) => (
        <div className="flex items-center">
          <Rate allowHalf defaultValue={rating} disabled className="text-yellow-500 text-sm" />
          <span className="ml-2 font-medium">{Number(rating).toFixed(1)}</span>
        </div>
      ),
      sorter: (a, b) => a.rating - b.rating,
    },
    {
      title: 'Price',
      dataIndex: 'price',
      key: 'price',
      render: (price: number, record: Game) => (
        <div>
          {record.discount ? (
            <div>
              <span className="line-through text-gray-400 mr-2">¥{price}</span>
              <span className="text-red-600 font-semibold">
                ¥{(price * (1 - record.discount / 100)).toFixed(0)}
              </span>
              <Tag color="red" className="ml-2">-{record.discount}%</Tag>
            </div>
          ) : (
            <span className="font-medium">¥{price}</span>
          )}
        </div>
      ),
      sorter: (a, b) => a.price - b.price,
    },
    {
      title: 'Display Zone',
      dataIndex: 'displayZone',
      key: 'displayZone',
      render: (zone: string | undefined) => {
        if (!zone || !DISPLAY_ZONE_MAP[zone]) return <Tag>未设置</Tag>;
        const config = DISPLAY_ZONE_MAP[zone];
        return <Tag color={config.color} icon={config.icon}>{config.label}</Tag>;
      },
      filters: [
        { text: '推荐游戏', value: 'recommended' },
        { text: '直充游戏', value: 'top-up' },
        { text: '独立游戏', value: 'indie' },
      ],
      onFilter: (value, record) => record.displayZone === value,
    },
    {
      title: 'Status',
      key: 'status',
      render: (_: unknown, record: any) => (
        <div className="flex flex-col space-y-1">
          <Switch
            checkedChildren="Active"
            unCheckedChildren="Inactive"
            checked={record.status !== 'archived'}
            size="small"
            onChange={async (checked) => {
              try {
                await apiService.updateGame(record.id, { status: checked ? 'active' : 'archived' });
                message.success(checked ? 'Game activated' : 'Game archived');
                fetchGames();
              } catch { message.error('Failed to update status'); }
            }}
          />
          <span className="text-xs text-gray-500">{record.status || 'Published'}</span>
        </div>
      ),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            icon={<EyeOutlined />}
            size="small"
            onClick={() => handleViewGame(record)}
            className="text-blue-500 hover:text-blue-700"
          />
          <Button
            type="text"
            icon={<EditOutlined />}
            size="small"
            onClick={() => handleEditGame(record)}
            className="text-green-500 hover:text-green-700"
          />
          <Popconfirm
            title="Delete Game"
            description="Are you sure you want to delete this game?"
            onConfirm={() => handleDeleteGame(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Button
              type="text"
              icon={<DeleteOutlined />}
              size="small"
              danger
              className="hover:text-red-700"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 搜索功能
  const handleSearch = (value: string) => {
    setSearchText(value);
    if (!value.trim()) {
      setFilteredGames(games);
      return;
    }

    const filtered = games.filter(game =>
      game.title.toLowerCase().includes(value.toLowerCase()) ||
      game.developer.toLowerCase().includes(value.toLowerCase()) ||
      game.publisher.toLowerCase().includes(value.toLowerCase()) ||
      game.genres.some(genre => genre.toLowerCase().includes(value.toLowerCase()))
    );
    setFilteredGames(filtered);
  };

  // 查看游戏
  const handleViewGame = (game: Game) => {
    Modal.info({
      title: game.title,
      width: 800,
      content: (
        <div className="space-y-6">
          <div className="flex space-x-6">
            <Image
              src={game.imageUrl}
              alt={game.title}
              width={300}
              height={200}
              className="rounded-lg object-cover"
              preview={false}
            />
            <div className="flex-1">
              <h3 className="text-xl font-bold mb-2">{game.title}</h3>
              <div className="space-y-2">
                <div>
                  <span className="font-medium">Developer:</span> {game.developer}
                </div>
                <div>
                  <span className="font-medium">Publisher:</span> {game.publisher}
                </div>
                <div>
                  <span className="font-medium">Release Date:</span> {game.releaseDate}
                </div>
                <div>
                  <span className="font-medium">Rating:</span>{' '}
                  <Rate allowHalf defaultValue={game.rating} disabled /> {Number(game.rating).toFixed(1)}
                </div>
                <div>
                  <span className="font-medium">Price:</span> ¥{game.price}
                  {game.discount && (
                    <Tag color="red" className="ml-2">-{game.discount}%</Tag>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-2">Description</h4>
            <p className="text-gray-700">{game.description}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold mb-2">Genres</h4>
              <Space wrap>
                {game.genres.map(genre => (
                  <Tag key={genre} color="blue">{genre}</Tag>
                ))}
              </Space>
            </div>
            <div>
              <h4 className="font-semibold mb-2">Platforms</h4>
              <Space wrap>
                {game.platforms.map(platform => (
                  <Tag key={platform} color="green">{platform}</Tag>
                ))}
              </Space>
            </div>
          </div>

          {game.screenshots && game.screenshots.length > 0 && (
            <div>
              <h4 className="font-semibold mb-2">Screenshots</h4>
              <div className="grid grid-cols-3 gap-2">
                {game.screenshots.slice(0, 3).map((screenshot, index) => (
                  <Image
                    key={index}
                    src={screenshot}
                    alt={`Screenshot ${index + 1}`}
                    width={200}
                    height={120}
                    className="rounded object-cover"
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ),
    });
  };

  // 编辑游戏
  const handleEditGame = (game: Game) => {
    setEditingGame(game);
    form.setFieldsValue({
      ...game,
      genres: game.genres.join(','),
      platforms: game.platforms.join(','),
    });
    setIsModalVisible(true);
  };

  // 删除游戏
  const handleDeleteGame = async (gameId: string | number) => {
    try {
      const idStr = String(gameId);
      await apiService.deleteGame(idStr);
      setGames(games.filter(game => String(game.id) !== idStr));
      setFilteredGames(filteredGames.filter(game => String(game.id) !== idStr));
      message.success('Game deleted successfully');
    } catch (err) {
      console.error('删除游戏失败:', err);
      message.error('Failed to delete game');
    }
  };

  // 添加新游戏
  const handleAddGame = () => {
    setEditingGame(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  // 处理表单提交
  const handleSubmit = async (values: Record<string, unknown>) => {
    try {
      const gameData: Record<string, unknown> = {
        title: values.title,
        developer: values.developer,
        publisher: values.publisher,
        releaseDate: values.releaseDate,
        description: values.description,
        rating: Number(values.rating),
        price: Number(values.price),
        discount: Number(values.discount || 0),
        genres: String(values.genres || '').split(',').map((g: string) => g.trim()),
        platforms: String(values.platforms || '').split(',').map((p: string) => p.trim()),
        imageUrl: String(values.imageUrl || ''),
        screenshots: values.screenshots ? String(values.screenshots).split(',').map((s: string) => s.trim()) : [],
        displayZone: values.displayZone || undefined,
      };

      if (editingGame) {
        await apiService.updateGame(String(editingGame.id), gameData);
        message.success('Game updated successfully');
      } else {
        await apiService.createGame(gameData);
        message.success('Game added successfully');
      }
      setIsModalVisible(false);
      await fetchGames();
    } catch (err) {
      console.error('保存游戏失败:', err);
      message.error('Failed to save game');
    }
  };

  // 行选择配置
  const rowSelection = {
    selectedRowKeys,
    onChange: (keys: React.Key[]) => {
      setSelectedRowKeys(keys);
    },
  };

  // 批量删除
  const handleBatchDelete = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Please select games to delete');
      return;
    }

    Modal.confirm({
      title: 'Delete Selected Games',
      content: `Are you sure you want to delete ${selectedRowKeys.length} games?`,
      onOk: async () => {
        try {
          await Promise.all(selectedRowKeys.map(id => apiService.deleteGame(id)));
          const updatedGames = games.filter(game => !selectedRowKeys.includes(game.id));
          setGames(updatedGames);
          setFilteredGames(updatedGames);
          setSelectedRowKeys([]);
          message.success(`${selectedRowKeys.length} games deleted successfully`);
        } catch {
          message.error('Failed to delete some games');
        }
      },
    });
  };

  // 导入游戏
  const handleImportGames = () => {
    message.info('Import functionality coming soon');
  };

  // 导出游戏
  const handleExportGames = () => {
    message.info('Export functionality coming soon');
  };

  return (
    <div className="games-page">
      <SEO title="游戏管理 | GameHub" description="管理平台游戏数据，添加和编辑游戏信息" keywords="游戏管理, 游戏数据, 游戏列表, 游戏编辑, 游戏添加" noindex />
      <h1 className="text-2xl font-bold mb-6">Game Management</h1>

      {/* 操作栏 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="flex-1">
          <Search
            placeholder="Search games by title, developer, or genre"
            allowClear
            enterButton={<SearchOutlined />}
            size="large"
            onSearch={handleSearch}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full sm:w-auto"
            style={{ maxWidth: 400 }}
          />
        </div>
        <div className="flex items-center space-x-2">
          <Button icon={<FilterOutlined />} size="large">
            Filters
          </Button>
          <Button
            icon={<UploadOutlined />}
            size="large"
            onClick={handleImportGames}
            className="border-green-500 text-green-600 hover:text-green-700 hover:border-green-600"
          >
            Import
          </Button>
          <Button
            icon={<DownloadOutlined />}
            size="large"
            onClick={handleExportGames}
            className="border-blue-500 text-blue-600 hover:text-blue-700 hover:border-blue-600"
          >
            Export
          </Button>
          <ActionButtons
            onAdd={handleAddGame}
            onRefresh={fetchGames}
            showAdd={true}
            showEdit={selectedRowKeys.length === 1}
            showDelete={selectedRowKeys.length > 0}
          />
        </div>
      </div>

      {/* 批量操作 */}
      {selectedRowKeys.length > 0 && (
        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="font-medium text-blue-700">
                {selectedRowKeys.length} game(s) selected
              </span>
              <Popconfirm
                title="Delete Selected Games"
                description="This action cannot be undone. Delete selected games?"
                onConfirm={handleBatchDelete}
              >
                <Button
                  size="small"
                  danger
                  className="border-red-300 text-red-600 hover:text-red-700 hover:border-red-400"
                >
                  Delete Selected
                </Button>
              </Popconfirm>
              <Button
                size="small"
                className="border-green-300 text-green-600 hover:text-green-700 hover:border-green-400"
              >
                Apply Discount
              </Button>
            </div>
            <Button
              type="link"
              onClick={() => setSelectedRowKeys([])}
              className="text-gray-600"
            >
              Clear Selection
            </Button>
          </div>
        </div>
      )}

      {/* 游戏表格 */}
      <Table
        columns={columns}
        dataSource={filteredGames}
        rowKey="id"
        rowSelection={rowSelection}
        scroll={{ x: 'max-content', y: 600 }}
        virtual
        loading={loading}
        pagination={{
          pageSize: 10,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total) => `Total ${total} games`,
        }}
        className="shadow-sm border-gray-200"
      />

      {/* 添加/编辑游戏模态框 */}
      <Modal
        title={editingGame ? 'Edit Game' : 'Add New Game'}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            rating: 4.0,
            discount: 0,
          }}
        >
          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              label="Game Title"
              name="title"
              rules={[{ required: true, message: 'Please enter game title' }]}
            >
              <Input placeholder="Enter game title" />
            </Form.Item>

            <Form.Item
              label="Developer"
              name="developer"
              rules={[{ required: true, message: 'Please enter developer' }]}
            >
              <Input placeholder="Enter developer name" />
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              label="Publisher"
              name="publisher"
              rules={[{ required: true, message: 'Please enter publisher' }]}
            >
              <Input placeholder="Enter publisher name" />
            </Form.Item>

            <Form.Item
              label="Release Date"
              name="releaseDate"
              rules={[{ required: true, message: 'Please select release date' }]}
            >
              <Input type="date" />
            </Form.Item>
          </div>

          <Form.Item
            label="Description"
            name="description"
            rules={[{ required: true, message: 'Please enter description' }]}
          >
            <TextArea rows={4} placeholder="Enter game description" />
          </Form.Item>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              label="Genres (comma separated)"
              name="genres"
              rules={[{ required: true, message: 'Please enter genres' }]}
            >
              <Input placeholder="e.g. RPG, Action, Adventure" />
            </Form.Item>

            <Form.Item
              label="Platforms (comma separated)"
              name="platforms"
              rules={[{ required: true, message: 'Please enter platforms' }]}
            >
              <Input placeholder="e.g. PC, PlayStation, Xbox" />
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              label="Display Zone"
              name="displayZone"
              rules={[{ required: true, message: 'Please select a display zone' }]}
            >
              <Select placeholder="Select display zone" allowClear>
                <Option value="recommended">
                  <Space><ThunderboltOutlined className="text-yellow-500" /> 推荐游戏</Space>
                </Option>
                <Option value="top-up">
                  <Space><DollarOutlined className="text-green-500" /> 直充游戏</Space>
                </Option>
                <Option value="indie">
                  <Space><RocketOutlined className="text-purple-500" /> 独立游戏</Space>
                </Option>
              </Select>
            </Form.Item>

            <Form.Item
              label="Discount (%)"
              name="discount"
            >
              <Input type="number" min={0} max={100} placeholder="0-100" />
            </Form.Item>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <Form.Item
              label="Rating"
              name="rating"
              rules={[{ required: true, message: 'Please enter rating' }]}
            >
              <Input type="number" min={0} max={5} step={0.1} placeholder="0.0 - 5.0" />
            </Form.Item>

            <Form.Item
              label="Price"
              name="price"
              rules={[{ required: true, message: 'Please enter price' }]}
            >
              <Input type="number" min={0} placeholder="Enter price" />
            </Form.Item>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Form.Item
              label="Image URL"
              name="imageUrl"
              rules={[{ required: true, message: 'Please enter image URL' }]}
            >
              <Input placeholder="Enter main image URL" />
            </Form.Item>

            <Form.Item
              label="Screenshots (comma separated URLs)"
              name="screenshots"
            >
              <Input placeholder="Enter screenshot URLs" />
            </Form.Item>
          </div>

          <Form.Item className="mb-0">
            <div className="flex justify-end space-x-2">
              <Button onClick={() => setIsModalVisible(false)}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                {editingGame ? 'Update Game' : 'Add Game'}
              </Button>
            </div>
          </Form.Item>
        </Form>
      </Modal>

      {/* 游戏统计 */}
      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-4">Game Statistics</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-500">Total Games</div>
            <div className="text-2xl font-bold">{games.length}</div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-500">Avg. Rating</div>
            <div className="text-2xl font-bold text-yellow-600">
              {(games.reduce((sum, game) => sum + game.rating, 0) / games.length).toFixed(1)}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-500">Avg. Price</div>
            <div className="text-2xl font-bold text-green-600">
              ¥{(games.reduce((sum, game) => sum + game.price, 0) / games.length).toFixed(0)}
            </div>
          </div>
          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <div className="text-sm text-gray-500">On Sale</div>
            <div className="text-2xl font-bold text-red-600">
              {games.filter(game => game.discount && game.discount > 0).length}
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h4 className="font-semibold mb-4">Top Genres</h4>
            <div className="space-y-3">
              {(() => {
                const genreCount: Record<string, number> = {};
                games.forEach(game => {
                  game.genres.forEach(genre => {
                    genreCount[genre] = (genreCount[genre] || 0) + 1;
                  });
                });
                return Object.entries(genreCount)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 5)
                  .map(([genre, count]) => (
                    <div key={genre} className="flex items-center justify-between">
                      <span className="text-gray-700">{genre}</span>
                      <div className="flex items-center">
                        <div className="w-32 bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className="bg-primary-500 h-2 rounded-full"
                            style={{ width: `${(count / games.length) * 100}%` }}
                          />
                        </div>
                        <span className="font-medium">{count}</span>
                      </div>
                    </div>
                  ));
              })()}
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <h4 className="font-semibold mb-4">Platform Distribution</h4>
            <div className="space-y-3">
              {(() => {
                const platformCount: Record<string, number> = {};
                games.forEach(game => {
                  game.platforms.forEach(platform => {
                    platformCount[platform] = (platformCount[platform] || 0) + 1;
                  });
                });
                return Object.entries(platformCount)
                  .sort((a, b) => b[1] - a[1])
                  .map(([platform, count]) => (
                    <div key={platform} className="flex items-center justify-between">
                      <Tag color="green">{platform}</Tag>
                      <span className="font-medium">{count} games</span>
                    </div>
                  ));
              })()}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .games-page :global(.ant-table-thead > tr > th) {
          background-color: #fafafa;
          font-weight: 600;
        }
        .games-page :global(.ant-table-tbody > tr:hover > td) {
          background-color: #fafafa !important;
        }
      `}</style>
    </div>
  );
};

export default Games;