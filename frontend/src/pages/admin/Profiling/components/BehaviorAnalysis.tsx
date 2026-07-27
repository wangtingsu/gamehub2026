import React, { useState } from 'react';
import { Card, Row, Col, Statistic, Input, Table, Tag, Spin, Empty } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { useBehaviorProfile, useBehaviorDistributions, usePeakLoginHours } from '../../../../api/hooks';

const FREQ_COLORS: Record<string, string> = { high: '#52c41a', medium: '#1890ff', low: '#faad14', inactive: '#d9d9d9' };
const FREQ_LABELS: Record<string, string> = { high: '高活跃', medium: '中活跃', low: '低活跃', inactive: '不活跃' };

const BehaviorAnalysis: React.FC = () => {
  const [searchUserId, setSearchUserId] = useState('');
  const [queryUserId, setQueryUserId] = useState('');

  const { data: profile, isLoading: profileLoading } = useBehaviorProfile(queryUserId);
  const { data: distributions, isLoading: distLoading } = useBehaviorDistributions();
  const { data: peakHours, isLoading: peakLoading } = usePeakLoginHours(30);

  const freqData = distributions?.loginFrequency
    ? Object.entries(distributions.loginFrequency).map(([key, value]) => ({ name: FREQ_LABELS[key] || key, value, color: FREQ_COLORS[key] || '#888' }))
    : [];

  const levelData = distributions?.levelDistribution || [];

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24}>
        <Card title="用户行为查询">
          <div className="flex gap-2 mb-4">
            <Input.Search placeholder="输入用户ID查询行为画像" enterButton={<><SearchOutlined /> 查询</>}
              value={searchUserId} onChange={e => setSearchUserId(e.target.value)}
              onSearch={() => setQueryUserId(searchUserId)} style={{ maxWidth: 300 }} />
          </div>
          {queryUserId && (
            profileLoading ? <div className="flex justify-center py-8"><Spin /></div> :
            profile ? (
              <div>
                <Row gutter={[16, 16]}>
                  <Col span={6}><Statistic title="用户名" value={profile.username} /></Col>
                  <Col span={6}><Statistic title="总登录" value={profile.totalLogins} suffix="次" /></Col>
                  <Col span={6}><Statistic title="30天登录" value={profile.logins30d} suffix="次" /></Col>
                  <Col span={6}><Statistic title="累计时长" value={Math.round(profile.totalLoginTime / 60)} suffix="小时" /></Col>
                  <Col span={6}><Statistic title="平均会话" value={profile.avgSessionDuration} suffix="分钟" /></Col>
                  <Col span={6}>
                    <Statistic title="登录频率" value={FREQ_LABELS[profile.loginFrequency] || profile.loginFrequency}
                      valueStyle={{ color: FREQ_COLORS[profile.loginFrequency] || '#000' }} />
                  </Col>
                  <Col span={6}><Statistic title="评测" value={profile.reviewsCount} /></Col>
                  <Col span={6}><Statistic title="评论" value={profile.commentsCount} /></Col>
                </Row>
                <div className="mt-3">
                  <span className="text-sm text-gray-500 mr-2">标签：</span>
                  {profile.tags?.map(t => <Tag key={t.id} color={t.color}>{t.name}</Tag>)}
                  {!profile.tags?.length && <span className="text-sm text-gray-400">无标签</span>}
                </div>
              </div>
            ) : <Empty description="用户不存在或查询失败" />
          )}
        </Card>
      </Col>

      <Col xs={24} lg={12}>
        <Card title="登录频率分布">
          {distLoading ? <div className="flex justify-center py-8"><Spin /></div> : !freqData.length ? <Empty description="暂无数据" /> :
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={freqData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" name="用户数">
                {freqData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>}
        </Card>
      </Col>

      <Col xs={24} lg={12}>
        <Card title="用户等级分布">
          {distLoading ? <div className="flex justify-center py-8"><Spin /></div> : !levelData.length ? <Empty description="暂无数据" /> :
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={levelData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="level" label={{ value: '等级', position: 'insideBottom', offset: -5 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" name="用户数" fill="#1890ff" />
            </BarChart>
          </ResponsiveContainer>}
        </Card>
      </Col>

      <Col xs={24}>
        <Card title="登录高峰时段（24小时）">
          {peakLoading ? <div className="flex justify-center py-8"><Spin /></div> : !peakHours?.length ? <Empty description="暂无数据" /> :
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={peakHours} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="hour" label={{ value: '小时', position: 'insideBottom', offset: -5 }} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="count" name="登录次数" fill="#722ed1" />
            </BarChart>
          </ResponsiveContainer>}
        </Card>
      </Col>
    </Row>
  );
};

export default BehaviorAnalysis;
