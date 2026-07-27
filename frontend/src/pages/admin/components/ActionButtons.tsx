import React from 'react';
import { Button, Space, Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  MoreOutlined,
  DownloadOutlined,
  UploadOutlined,
  ReloadOutlined,
} from '@ant-design/icons';

interface ActionButtonsProps {
  onAdd?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onImport?: () => void;
  onExport?: () => void;
  onRefresh?: () => void;
  showAdd?: boolean;
  showEdit?: boolean;
  showDelete?: boolean;
  showImport?: boolean;
  showExport?: boolean;
  showRefresh?: boolean;
  disabled?: boolean;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  onAdd,
  onEdit,
  onDelete,
  onImport,
  onExport,
  onRefresh,
  showAdd = true,
  showEdit = false,
  showDelete = false,
  showImport = false,
  showExport = false,
  showRefresh = true,
  disabled = false,
}) => {
  const moreItems: MenuProps['items'] = [
    {
      key: 'import',
      label: 'Import Data',
      icon: <UploadOutlined />,
      onClick: onImport,
      disabled: !onImport,
    },
    {
      key: 'export',
      label: 'Export Data',
      icon: <DownloadOutlined />,
      onClick: onExport,
      disabled: !onExport,
    },
    {
      type: 'divider',
    },
    {
      key: 'refresh',
      label: 'Refresh',
      icon: <ReloadOutlined />,
      onClick: onRefresh,
    },
  ];

  return (
    <Space wrap className="mb-4">
      {showAdd && (
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={onAdd}
          disabled={disabled}
          className="bg-primary-500 hover:bg-primary-600 border-primary-500"
        >
          Add New
        </Button>
      )}

      {showEdit && (
        <Button
          type="default"
          icon={<EditOutlined />}
          onClick={onEdit}
          disabled={disabled}
          className="border-gray-300 text-gray-700 hover:text-primary-500 hover:border-primary-300"
        >
          Edit
        </Button>
      )}

      {showDelete && (
        <Button
          type="default"
          danger
          icon={<DeleteOutlined />}
          onClick={onDelete}
          disabled={disabled}
          className="border-red-300 text-red-600 hover:text-red-700 hover:border-red-400"
        >
          Delete
        </Button>
      )}

      {(showImport || showExport) && (
        <Dropdown menu={{ items: moreItems }} placement="bottomRight">
          <Button
            type="default"
            icon={<MoreOutlined />}
            className="border-gray-300 text-gray-700 hover:text-primary-500 hover:border-primary-300"
          >
            More Actions
          </Button>
        </Dropdown>
      )}

      {showRefresh && (
        <Button
          type="text"
          icon={<ReloadOutlined />}
          onClick={onRefresh}
          disabled={disabled}
          className="text-gray-500 hover:text-primary-500"
        >
          Refresh
        </Button>
      )}
    </Space>
  );
};

export default ActionButtons;