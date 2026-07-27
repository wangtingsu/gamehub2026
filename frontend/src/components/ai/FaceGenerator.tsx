/**
 * FaceGenerator - AI 捏脸组件
 *
 * 提供基于 SVG 的 2D 角色面部生成功能：
 * - 选择脸型、眼睛、鼻子、嘴巴、发型、肤色
 * - 实时 SVG 预览
 * - 支持多种面部特征的组合定制
 */
import { useState } from 'react';
import { Card, Row, Col, Button, Tag, Slider, Typography, Divider } from 'antd';
import {
  UndoOutlined, CheckOutlined, SmileOutlined,
} from '@ant-design/icons';

const { Text, Title } = Typography;

/* ========== 面部特征选项常量 ========== */

const faceShapes = ['圆形', '椭圆', '方形', '心形', '长形'];
const eyeStyles = ['大眼', '细长眼', '丹凤眼', '圆眼', '眯眼'];
const noseStyles = ['高挺', '小巧', '圆润', '宽鼻', '直鼻'];
const mouthStyles = ['微笑', '大笑', '抿嘴', '嘟嘴', '严肃'];
const hairStyles = ['短发', '长发', '马尾', '卷发', '寸头'];
const skinTones = ['白皙', '自然', '小麦', '古铜', '深色'];

/**
 * SVG 头像预览组件
 * 使用 SVG 绘制带有不同面部特征的 2D 角色头像
 * 包含皮肤、眉毛、眼睛、鼻子、嘴巴、腮红、耳朵和头发等图层
 */
const AvatarPreview = ({ faceShape, eyeStyle, noseStyle, mouthStyle, hairStyle, skinTone }: {
  faceShape: string; eyeStyle: string; noseStyle: string; mouthStyle: string; hairStyle: string; skinTone: string;
}) => {
  const skinColorMap: Record<string, string> = {
    '白皙': '#fce4d6', '自然': '#f5d0b0', '小麦': '#e0b090', '古铜': '#c4956a', '深色': '#8d6e4e',
  };
  const skinColor = skinColorMap[skinTone] || '#f5d0b0';
  const hairColor = '#4a3728';
  const eyeColor = '#3a2819';

  // 根据脸型调整clipPath
  const clipPaths: Record<string, string> = {
    '圆形': 'circle(50% at 50% 50%)',
    '椭圆': 'ellipse(40% 48% at 50% 50%)',
    '方形': 'inset(5% 15% round 20%)',
    '心形': 'polygon(50% 0%, 90% 25%, 85% 65%, 50% 100%, 15% 65%, 10% 25%)',
    '长形': 'ellipse(35% 48% at 50% 50%)',
  };

  // 眼睛SVG路径
  const renderEyes = () => {
    switch (eyeStyle) {
      case '大眼':
        return (
          <>
            <circle cx="52" cy="72" r="8" fill="white" />
            <circle cx="52" cy="72" r="4" fill={eyeColor} />
            <circle cx="148" cy="72" r="8" fill="white" />
            <circle cx="148" cy="72" r="4" fill={eyeColor} />
          </>
        );
      case '细长眼':
        return (
          <>
            <ellipse cx="52" cy="72" rx="10" ry="4" fill="white" />
            <ellipse cx="52" cy="72" rx="5" ry="2.5" fill={eyeColor} />
            <ellipse cx="148" cy="72" rx="10" ry="4" fill="white" />
            <ellipse cx="148" cy="72" rx="5" ry="2.5" fill={eyeColor} />
          </>
        );
      case '丹凤眼':
        return (
          <>
            <ellipse cx="52" cy="72" rx="9" ry="3.5" fill="white" transform="rotate(-10 52 72)" />
            <ellipse cx="52" cy="72" rx="4.5" ry="2" fill={eyeColor} transform="rotate(-10 52 72)" />
            <ellipse cx="148" cy="72" rx="9" ry="3.5" fill="white" transform="rotate(10 148 72)" />
            <ellipse cx="148" cy="72" rx="4.5" ry="2" fill={eyeColor} transform="rotate(10 148 72)" />
          </>
        );
      case '圆眼':
        return (
          <>
            <circle cx="52" cy="72" r="7" fill="white" stroke="#333" strokeWidth="0.5" />
            <circle cx="52" cy="72" r="4" fill={eyeColor} />
            <circle cx="148" cy="72" r="7" fill="white" stroke="#333" strokeWidth="0.5" />
            <circle cx="148" cy="72" r="4" fill={eyeColor} />
          </>
        );
      case '眯眼':
        return (
          <>
            <line x1="42" y1="72" x2="62" y2="72" stroke={eyeColor} strokeWidth="2.5" strokeLinecap="round" />
            <line x1="138" y1="72" x2="158" y2="72" stroke={eyeColor} strokeWidth="2.5" strokeLinecap="round" />
          </>
        );
      default:
        return null;
    }
  };

  // 鼻子SVG路径
  const renderNose = () => {
    const nosePath: Record<string, string> = {
      '高挺': 'M 100 82 Q 95 92 100 98 Q 105 92 100 82',
      '小巧': 'M 100 86 Q 97 92 100 95 Q 103 92 100 86',
      '圆润': 'M 97 88 Q 100 95 103 88 Q 100 84 97 88',
      '宽鼻': 'M 94 86 Q 100 94 106 86',
      '直鼻': 'M 100 82 L 100 96',
    };
    return <path d={nosePath[noseStyle] || nosePath['高挺']} fill="none" stroke="#8d6e4e" strokeWidth="1.5" strokeLinecap="round" />;
  };

  // 嘴巴SVG路径
  const renderMouth = () => {
    switch (mouthStyle) {
      case '微笑': return <path d="M 80 100 Q 100 112 120 100" fill="none" stroke="#c44" strokeWidth="2" strokeLinecap="round" />;
      case '大笑': return <path d="M 78 100 Q 100 118 122 100 Q 100 112 78 100" fill="#c44" strokeWidth="0" />;
      case '抿嘴': return <line x1="82" y1="104" x2="118" y2="104" stroke="#c44" strokeWidth="2" strokeLinecap="round" />;
      case '嘟嘴': return <ellipse cx="100" cy="104" rx="12" ry="6" fill="none" stroke="#c44" strokeWidth="2" />;
      case '严肃': return <path d="M 82 104 Q 100 100 118 104" fill="none" stroke="#c44" strokeWidth="2" strokeLinecap="round" />;
      default: return null;
    }
  };

  // 头发SVG
  const renderHair = () => {
    switch (hairStyle) {
      case '短发':
        return <path d="M 50 55 Q 50 30 100 25 Q 150 30 150 55 Q 140 40 100 38 Q 60 40 50 55" fill={hairColor} />;
      case '长发':
        return <path d="M 45 55 Q 40 25 100 20 Q 160 25 155 55 L 158 100 Q 150 105 145 90 Q 140 105 130 95 Q 125 105 115 92 Q 110 105 100 95 Q 90 105 85 92 Q 75 105 70 95 Q 60 105 55 90 Q 50 105 45 100 Z" fill={hairColor} />;
      case '马尾':
        return (
          <>
            <path d="M 48 55 Q 45 28 100 22 Q 155 28 152 55 Q 145 40 100 35 Q 55 40 48 55" fill={hairColor} />
            <path d="M 155 45 Q 175 40 178 60 Q 180 80 165 85 Q 170 70 168 55 Q 165 45 155 45" fill={hairColor} />
          </>
        );
      case '卷发':
        return (
          <>
            <path d="M 42 58 Q 38 32 70 25 Q 85 20 100 22 Q 115 20 130 25 Q 162 32 158 58 Q 155 48 140 42 Q 130 38 100 36 Q 70 38 60 42 Q 45 48 42 58" fill={hairColor} />
            {[0, 1, 2, 3, 4].map(i => (
              <circle key={i} cx={55 + i * 22} cy={35 + Math.sin(i) * 8} r="7" fill={hairColor} />
            ))}
          </>
        );
      case '寸头':
        return <path d="M 48 58 Q 42 30 100 22 Q 158 30 152 58 L 152 52 Q 158 28 100 18 Q 42 28 48 52 Z" fill={hairColor} />;
      default:
        return null;
    }
  };

  return (
    <svg width="200" height="200" viewBox="0 0 200 200" className="w-full h-full">
      {/* 头发层 */}
      <g>{renderHair()}</g>
      {/* 脸部 */}
      <ellipse cx="100" cy="85" rx="58" ry="62" fill={skinColor} stroke="#ddd" strokeWidth="1" />
      {/* 眉毛 */}
      <line x1="38" y1="58" x2="62" y2="55" stroke="#555" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="138" y1="55" x2="162" y2="58" stroke="#555" strokeWidth="1.5" strokeLinecap="round" />
      {/* 眼睛 */}
      {renderEyes()}
      {/* 鼻子 */}
      {renderNose()}
      {/* 嘴巴 */}
      {renderMouth()}
      {/* 腮红 */}
      <circle cx="35" cy="85" r="10" fill="rgba(255,150,150,0.15)" />
      <circle cx="165" cy="85" r="10" fill="rgba(255,150,150,0.15)" />
      {/* 耳朵 */}
      <ellipse cx="38" cy="80" rx="6" ry="10" fill={skinColor} stroke="#ddd" strokeWidth="0.5" />
      <ellipse cx="162" cy="80" rx="6" ry="10" fill={skinColor} stroke="#ddd" strokeWidth="0.5" />
    </svg>
  );
};

/**
 * FaceGenerator 主组件
 * 提供面部特征选择、SVG 实时预览和重置功能
 */
const FaceGenerator: React.FC = () => {
  /* ====== 面部特征状态 ====== */
  const [faceShape, setFaceShape] = useState('椭圆');
  const [eyeStyle, setEyeStyle] = useState('大眼');
  const [noseStyle, setNoseStyle] = useState('高挺');
  const [mouthStyle, setMouthStyle] = useState('微笑');
  const [hairStyle, setHairStyle] = useState('短发');
  const [skinTone, setSkinTone] = useState('自然');
  const [eyeSize, setEyeSize] = useState(50);

  /** 重置所有面部特征为默认值 */
  const handleReset = () => {
    setFaceShape('椭圆');
    setEyeStyle('大眼');
    setNoseStyle('高挺');
    setMouthStyle('微笑');
    setHairStyle('短发');
    setSkinTone('自然');
    setEyeSize(50);
  };

  /**
   * 选项组子组件
   * 使用 Tag 标签渲染一组可选选项，选中的标签高亮显示
   * @param label - 选项组名称
   * @param options - 可选值数组
   * @param value - 当前选中值
   * @param onChange - 值变更回调
   */
  const OptionGroup = ({ label, options, value, onChange }: { label: string; options: string[]; value: string; onChange: (v: string) => void }) => (
    <div className="mb-4">
      <Text className="text-sm text-gray-500 block mb-2">{label}</Text>
      <div className="flex flex-wrap gap-2">
        {options.map(opt => (
          <Tag
            key={opt}
            color={value === opt ? 'blue' : 'default'}
            className="cursor-pointer px-3 py-1 text-sm"
            onClick={() => onChange(opt)}
          >
            {opt}
          </Tag>
        ))}
      </div>
    </div>
  );

  return (
    <div className="p-2">
      <div className="flex items-center gap-2 mb-4">
        <SmileOutlined className="text-blue-500 text-lg" />
        <span className="font-medium text-gray-700">AI 捏脸</span>
        <Tag color="blue" className="ml-auto">AI 角色创建</Tag>
      </div>

      <Row gutter={[24, 16]}>
        {/* 预览区 */}
        <Col xs={24} md={8}>
          <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-dashed">
            <div className="flex flex-col items-center">
              <div className="w-48 h-48 mb-3">
                <AvatarPreview
                  faceShape={faceShape}
                  eyeStyle={eyeStyle}
                  noseStyle={noseStyle}
                  mouthStyle={mouthStyle}
                  hairStyle={hairStyle}
                  skinTone={skinTone}
                />
              </div>
              <Title level={5} className="!mb-1">角色预览</Title>
              <Text className="text-xs text-gray-400">调整左侧选项自定义角色</Text>
            </div>
          </Card>
        </Col>

        {/* 选项区 */}
        <Col xs={24} md={16}>
          <OptionGroup label="脸型" options={faceShapes} value={faceShape} onChange={setFaceShape} />
          <OptionGroup label="眼睛" options={eyeStyles} value={eyeStyle} onChange={setEyeStyle} />
          <OptionGroup label="鼻子" options={noseStyles} value={noseStyle} onChange={setNoseStyle} />
          <OptionGroup label="嘴巴" options={mouthStyles} value={mouthStyle} onChange={setMouthStyle} />
          <OptionGroup label="发型" options={hairStyles} value={hairStyle} onChange={setHairStyle} />
          <OptionGroup label="肤色" options={skinTones} value={skinTone} onChange={setSkinTone} />

          <div className="mb-4">
            <Text className="text-sm text-gray-500 block mb-2">眼睛大小</Text>
            <Slider
              min={20}
              max={100}
              value={eyeSize}
              onChange={setEyeSize}
              className="w-full"
            />
          </div>

          <Divider />

          <div className="flex gap-3">
            <Button icon={<UndoOutlined />} onClick={handleReset}>
              重置
            </Button>
            <Button type="primary" icon={<CheckOutlined />}>
              应用角色
            </Button>
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default FaceGenerator;
