/**
 * AdvancedSearchFilters.tsx - 高级搜索筛选面板组件
 *
 * 提供多维度的搜索筛选条件，包括游戏类型、平台、评分范围、发布日期、排序方式和标签
 * 使用 Ant Design 的 Collapse、Select、DatePicker、Slider 等组件构建表单
 */
import React, { useState } from 'react';
import { Collapse, Select, DatePicker, Slider, Input, Tag, Button, Space, Row, Col } from 'antd';
import { FilterOutlined, ClearOutlined } from '@ant-design/icons';
import type { AdvancedSearchFilters } from '../../api/types';

const { Panel } = Collapse;
const { RangePicker } = DatePicker;
const { TextArea } = Input;

/** AdvancedSearchFilters 组件（子组件）的 props */
interface AdvancedSearchFiltersProps {
  /** 是否可见（控制面板显隐） */
  visible: boolean;
  /** 当前筛选条件对象 */
  filters: AdvancedSearchFilters;
  /** 筛选条件变化时的回调 */
  onChange: (filters: AdvancedSearchFilters) => void;
  /** 重置所有筛选条件的回调 */
  onReset: () => void;
}

/** 游戏类型选项列表 */
const GENRE_OPTIONS = ['RPG', 'Action', 'Adventure', 'Simulation', 'Strategy', 'Sports', 'Puzzle', 'Horror', 'Shooter', 'Fighting', 'Racing', 'MMO'];
/** 平台选项列表 */
const PLATFORM_OPTIONS = ['PC', 'PS5', 'PS4', 'Xbox Series X', 'Xbox One', 'Nintendo Switch', 'Mobile', 'VR'];

/**
 * AdvancedSearchFiltersComponent - 高级搜索筛选面板
 * - 使用本地状态管理筛选条件，变化时同步回父组件
 * - 提供重置按钮一键清空所有筛选条件
 * - 支持游戏类型多选、平台多选、评分区间滑块、日期范围选择、排序方式选择、标签输入
 */
const AdvancedSearchFiltersComponent: React.FC<AdvancedSearchFiltersProps> = ({
  visible,
  filters,
  onChange,
  onReset,
}) => {
  // 本地管理筛选条件，避免每次变化都触发父组件渲染
  const [localFilters, setLocalFilters] = useState<AdvancedSearchFilters>(filters);

  /** 更新单个筛选条件：更新本地状态并通知父组件 */
  const handleChange = (key: keyof AdvancedSearchFilters, value: any) => {
    const updated = { ...localFilters, [key]: value };
    setLocalFilters(updated);
    onChange(updated);
  };

  if (!visible) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
      {/* 面板标题 */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center">
          <FilterOutlined className="mr-2" /> 高级筛选
        </h3>
        <Button icon={<ClearOutlined />} size="small" onClick={onReset}>
          重置
        </Button>
      </div>

      <Row gutter={[16, 16]}>
        {/* 游戏类型多选 */}
        <Col xs={24} sm={12} lg={8}>
          <div className="mb-1 text-sm text-gray-500">游戏类型</div>
          <Select
            mode="multiple"
            placeholder="选择类型"
            value={localFilters.genres}
            onChange={(v) => handleChange('genres', v)}
            className="w-full"
            options={GENRE_OPTIONS.map(g => ({ label: g, value: g }))}
          />
        </Col>

        {/* 平台多选 */}
        <Col xs={24} sm={12} lg={8}>
          <div className="mb-1 text-sm text-gray-500">平台</div>
          <Select
            mode="multiple"
            placeholder="选择平台"
            value={localFilters.platforms}
            onChange={(v) => handleChange('platforms', v)}
            className="w-full"
            options={PLATFORM_OPTIONS.map(p => ({ label: p, value: p }))}
          />
        </Col>

        {/* 评分范围滑块 */}
        <Col xs={24} sm={12} lg={8}>
          <div className="mb-1 text-sm text-gray-500">评分范围</div>
          <Slider
            range
            min={0}
            max={10}
            step={0.5}
            value={[localFilters.ratingMin ?? 0, localFilters.ratingMax ?? 10]}
            onChange={([min, max]) => {
              handleChange('ratingMin', min);
              handleChange('ratingMax', max);
            }}
            marks={{ 0: '0', 5: '5', 10: '10' }}
          />
        </Col>

        {/* 发布日期范围选择 */}
        <Col xs={24} sm={12} lg={8}>
          <div className="mb-1 text-sm text-gray-500">发布日期</div>
          <RangePicker
            className="w-full"
            value={
              localFilters.dateFrom && localFilters.dateTo
                ? [localFilters.dateFrom ? dayjs(localFilters.dateFrom) : null, localFilters.dateTo ? dayjs(localFilters.dateTo) : null]
                : null
            }
            onChange={(dates) => {
              handleChange('dateFrom', dates?.[0]?.format('YYYY-MM-DD'));
              handleChange('dateTo', dates?.[1]?.format('YYYY-MM-DD'));
            }}
          />
        </Col>

        {/* 排序方式选择 */}
        <Col xs={24} sm={12} lg={8}>
          <div className="mb-1 text-sm text-gray-500">排序方式</div>
          <Select
            value={localFilters.sortBy || 'relevance'}
            onChange={(v) => handleChange('sortBy', v)}
            className="w-full"
            options={[
              { label: '按相关性', value: 'relevance' },
              { label: '按时间', value: 'date' },
              { label: '按评分', value: 'rating' },
              { label: '按热度', value: 'popularity' },
            ]}
          />
        </Col>

        {/* 标签输入 */}
        <Col xs={24} sm={12} lg={8}>
          <div className="mb-1 text-sm text-gray-500">标签</div>
          <Select
            mode="tags"
            placeholder="输入标签"
            value={localFilters.tags}
            onChange={(v) => handleChange('tags', v)}
            className="w-full"
          />
        </Col>
      </Row>
    </div>
  );
};

/** dayjs 导入，用于 DatePicker 的日期格式化 */
import dayjs from 'dayjs';

export default AdvancedSearchFiltersComponent;
