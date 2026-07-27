import React from 'react';
import { Radio, Space } from 'antd';

interface PeriodSelectorProps {
  value: number;
  onChange: (days: number) => void;
}

const PeriodSelector: React.FC<PeriodSelectorProps> = ({ value, onChange }) => {
  return (
    <Radio.Group value={value} onChange={(e) => onChange(e.target.value)} buttonStyle="solid">
      <Radio.Button value={7}>最近7天</Radio.Button>
      <Radio.Button value={30}>最近30天</Radio.Button>
      <Radio.Button value={90}>最近90天</Radio.Button>
    </Radio.Group>
  );
};

export default PeriodSelector;
