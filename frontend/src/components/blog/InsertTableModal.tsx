import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Button, Input, InputNumber, Modal, Space, Switch, Tooltip, message,
} from 'antd';
import { PictureOutlined, LinkOutlined, DeleteOutlined } from '@ant-design/icons';
import { uploadToServer } from './uploadToServer';

/**
 * 单元格内容：文本 + 可选图片
 */
interface CellData {
  text: string;
  img: string | null;
}

interface InsertTableModalProps {
  open: boolean;
  onCancel: () => void;
  onOk: (html: string) => void;
}

/** HTML 转义，防止文本/URL 破坏表格结构或注入脚本 */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const DEFAULT_ROWS = 3;
const DEFAULT_COLS = 3;

/** 根据行列数生成/裁剪单元格矩阵（尽量保留已有内容） */
function resizeCells(prev: CellData[][], rows: number, cols: number): CellData[][] {
  const next: CellData[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: CellData[] = [];
    for (let c = 0; c < cols; c++) {
      row.push(prev?.[r]?.[c] ?? { text: '', img: null });
    }
    next.push(row);
  }
  return next;
}

/**
 * 插入表格弹窗
 *
 * 支持设置：行数、列数、行高、列宽、首行表头、表头/单元格背景色与文字色、边框色，
 * 并可在任意单元格中上传或粘贴图片。
 * 生成带内联样式的 HTML 表格，插入到 Markdown 正文光标处。
 * （正文渲染器 @uiw/react-markdown-preview 已启用 rehype-raw，可渲染内联 HTML 表格）
 */
const InsertTableModal: React.FC<InsertTableModalProps> = ({ open, onCancel, onOk }) => {
  const [rows, setRows] = useState(DEFAULT_ROWS);
  const [cols, setCols] = useState(DEFAULT_COLS);
  const [rowHeight, setRowHeight] = useState<number>(44);
  const [colWidth, setColWidth] = useState<number | null>(null); // null = 自动均分
  const [hasHeader, setHasHeader] = useState(true);
  const [headerBg, setHeaderBg] = useState('#1e293b');
  const [headerColor, setHeaderColor] = useState('#ffffff');
  const [cellBg, setCellBg] = useState('#ffffff');
  const [cellColor, setCellColor] = useState('#1f2937');
  const [borderColor, setBorderColor] = useState('#d1d5db');

  const [cells, setCells] = useState<CellData[][]>(() => resizeCells([], DEFAULT_ROWS, DEFAULT_COLS));
  const [selected, setSelected] = useState<{ r: number; c: number }>({ r: 0, c: 0 });
  const [uploading, setUploading] = useState(false);
  const [imgUrlVisible, setImgUrlVisible] = useState(false);
  const [imgUrlInput, setImgUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 打开时重置为默认，避免残留上次配置
  useEffect(() => {
    if (open) {
      setRows(DEFAULT_ROWS);
      setCols(DEFAULT_COLS);
      setRowHeight(44);
      setColWidth(null);
      setHasHeader(true);
      setHeaderBg('#1e293b');
      setHeaderColor('#ffffff');
      setCellBg('#ffffff');
      setCellColor('#1f2937');
      setBorderColor('#d1d5db');
      setCells(resizeCells([], DEFAULT_ROWS, DEFAULT_COLS));
      setSelected({ r: 0, c: 0 });
      setImgUrlVisible(false);
      setImgUrlInput('');
    }
  }, [open]);

  // 行列变化时裁剪/扩展矩阵
  useEffect(() => {
    setCells((prev) => resizeCells(prev, rows, cols));
    setSelected((sel) => (sel.r >= rows || sel.c >= cols ? { r: 0, c: 0 } : sel));
  }, [rows, cols]);

  const selectedCell = cells[selected.r]?.[selected.c] ?? { text: '', img: null };

  const updateSelectedCell = useCallback((patch: Partial<CellData>) => {
    setCells((prev) => {
      const next = prev.map((row) => [...row]);
      if (next[selected.r]?.[selected.c]) {
        next[selected.r][selected.c] = { ...next[selected.r][selected.c], ...patch };
      }
      return next;
    });
  }, [selected]);

  const handleUpload = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const url = await uploadToServer(file);
      if (!url) {
        message.error('图片上传失败');
        return;
      }
      updateSelectedCell({ img: url });
      message.success('图片已插入单元格');
    } catch {
      message.error('图片上传失败');
    } finally {
      setUploading(false);
    }
  }, [updateSelectedCell]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) handleUpload(files[0]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [handleUpload]);

  const handleInsertImgUrl = useCallback(() => {
    if (!imgUrlInput.trim()) return;
    updateSelectedCell({ img: imgUrlInput.trim() });
    setImgUrlInput('');
    setImgUrlVisible(false);
    message.success('图片已插入单元格');
  }, [imgUrlInput, updateSelectedCell]);

  // 生成单个单元格 HTML
  const renderCellHtml = useCallback((cell: CellData, isHeader: boolean): string => {
    const bg = isHeader ? headerBg : cellBg;
    const color = isHeader ? headerColor : cellColor;
    const tag = isHeader ? 'th' : 'td';
    const img = cell.img
      ? `<img src="${escapeHtml(cell.img)}" alt="" style="max-width:100%;display:block;margin:4px auto;" />`
      : '';
    const text = escapeHtml(cell.text).replace(/\n/g, '<br>');
    const inner = [img, text].filter(Boolean).join('');
    return `<${tag} style="background:${bg};color:${color};border:1px solid ${borderColor};padding:8px;height:${rowHeight}px;vertical-align:middle;${isHeader ? 'font-weight:600;' : ''}">${inner}</${tag}>`;
  }, [headerBg, cellBg, headerColor, cellColor, borderColor, rowHeight]);

  // 生成完整表格 HTML
  const generateHtml = useCallback((): string => {
    const colStyle = colWidth ? `width:${colWidth}px;` : '';
    const colgroup = `<colgroup>${Array.from({ length: cols }, () => `<col style="${colStyle}" />`).join('')}</colgroup>`;

    let thead = '';
    if (hasHeader && rows > 0) {
      const headerRow = cells[0].map((c) => renderCellHtml(c, true)).join('');
      thead = `<thead><tr>${headerRow}</tr></thead>`;
    }

    const bodyStart = hasHeader ? 1 : 0;
    const bodyRows = cells.slice(bodyStart)
      .map((row) => `<tr>${row.map((c) => renderCellHtml(c, false)).join('')}</tr>`)
      .join('');
    const tbody = bodyRows ? `<tbody>${bodyRows}</tbody>` : '';

    return `<table style="width:100%;border-collapse:collapse;margin:1rem 0;">${colgroup}${thead}${tbody}</table>`;
  }, [cols, colWidth, hasHeader, cells, renderCellHtml]);

  const handleOk = useCallback(() => {
    onOk(generateHtml());
  }, [onOk, generateHtml]);

  const colorInput = (
    label: string,
    value: string,
    onChange: (v: string) => void,
  ) => (
    <Space size={6} style={{ display: 'flex' }}>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: 26, height: 26, border: '1px solid #d9d9d9', borderRadius: 4,
          padding: 0, cursor: 'pointer', background: 'none', flex: 'none',
        }}
      />
      <span style={{ fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap' }}>{label}</span>
    </Space>
  );

  return (
    <Modal
      title="插入表格"
      open={open}
      onOk={handleOk}
      onCancel={onCancel}
      okText="插入表格"
      cancelText="取消"
      width={760}
    >
      {/* ===== 表格配置 ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px 16px', alignItems: 'center' }}>
        <Space size={6}>
          <span style={{ fontSize: 13, color: '#374151' }}>行数</span>
          <InputNumber size="small" min={1} max={30} value={rows} onChange={(v) => setRows(v ?? 1)} style={{ width: 64 }} />
        </Space>
        <Space size={6}>
          <span style={{ fontSize: 13, color: '#374151' }}>列数</span>
          <InputNumber size="small" min={1} max={12} value={cols} onChange={(v) => setCols(v ?? 1)} style={{ width: 64 }} />
        </Space>
        <Space size={6}>
          <span style={{ fontSize: 13, color: '#374151' }}>行高</span>
          <InputNumber size="small" min={20} max={200} value={rowHeight} onChange={(v) => setRowHeight(v ?? 44)} addonAfter="px" style={{ width: 92 }} />
        </Space>
        <Space size={6}>
          <span style={{ fontSize: 13, color: '#374151' }}>列宽</span>
          <InputNumber
            size="small" min={20} max={800} value={colWidth} onChange={(v) => setColWidth(v)}
            addonAfter="px" placeholder="自动" style={{ width: 92 }}
          />
        </Space>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 18px', alignItems: 'center', marginTop: 12 }}>
        {colorInput('表头背景', headerBg, setHeaderBg)}
        {colorInput('表头文字', headerColor, setHeaderColor)}
        {colorInput('单元格背景', cellBg, setCellBg)}
        {colorInput('单元格文字', cellColor, setCellColor)}
        {colorInput('边框', borderColor, setBorderColor)}
        <Space size={6}>
          <span style={{ fontSize: 13, color: '#374151' }}>首行为表头</span>
          <Switch size="small" checked={hasHeader} onChange={setHasHeader} />
        </Space>
      </div>

      {/* ===== 实时预览网格 ===== */}
      <div style={{ marginTop: 14, maxHeight: 300, overflow: 'auto', border: '1px solid #e5e7eb', borderRadius: 6 }}>
        <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: cols * 72 }}>
          <colgroup>
            {Array.from({ length: cols }).map((_, c) => (
              <col key={c} style={colWidth ? { width: colWidth } : undefined} />
            ))}
          </colgroup>
          <tbody>
            {cells.map((row, r) => (
              <tr key={r}>
                {row.map((cell, c) => {
                  const isHeaderCell = hasHeader && r === 0;
                  const isSelected = selected.r === r && selected.c === c;
                  return (
                    <td
                      key={c}
                      onClick={() => setSelected({ r, c })}
                      style={{
                        background: isHeaderCell ? headerBg : cellBg,
                        color: isHeaderCell ? headerColor : cellColor,
                        border: `2px solid ${isSelected ? '#1890ff' : borderColor}`,
                        padding: 6, height: Math.min(rowHeight, 90),
                        verticalAlign: 'middle', fontWeight: isHeaderCell ? 600 : 400,
                        cursor: 'pointer', minWidth: 56, textAlign: 'center',
                      }}
                    >
                      {cell.img ? (
                        <img
                          src={cell.img}
                          alt=""
                          style={{ maxWidth: 56, maxHeight: Math.min(rowHeight, 90) - 10, display: 'block', margin: '0 auto' }}
                        />
                      ) : null}
                      {cell.text ? (
                        <div style={{ fontSize: 12, lineHeight: 1.3, wordBreak: 'break-all' }}>{cell.text}</div>
                      ) : (
                        <div style={{ color: isHeaderCell ? 'rgba(255,255,255,0.4)' : '#c3c8cf', fontSize: 11 }}> </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ===== 单元格编辑 ===== */}
      <div style={{ marginTop: 12, padding: 12, background: '#f9fafb', borderRadius: 6, border: '1px solid #e5e7eb' }}>
        <div style={{ marginBottom: 8, fontSize: 12, color: '#6b7280' }}>
          编辑单元格：第 {selected.r + 1} 行 · 第 {selected.c + 1} 列{hasHeader && selected.r === 0 ? '（表头）' : ''} —— 点击上方网格可切换单元格
        </div>
        <Input.TextArea
          rows={2}
          value={selectedCell.text}
          onChange={(e) => updateSelectedCell({ text: e.target.value })}
          placeholder="输入该单元格的文本"
        />
        <Space style={{ marginTop: 8 }} wrap>
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileSelect} />
          <Tooltip title="上传图片到当前单元格">
            <Button size="small" icon={<PictureOutlined />} loading={uploading} onClick={() => fileInputRef.current?.click()}>
              上传图片
            </Button>
          </Tooltip>
          <Button size="small" icon={<LinkOutlined />} onClick={() => setImgUrlVisible((v) => !v)}>
            图片URL
          </Button>
          {selectedCell.img ? (
            <Button size="small" danger icon={<DeleteOutlined />} onClick={() => updateSelectedCell({ img: null })}>
              移除图片
            </Button>
          ) : null}
        </Space>
        {imgUrlVisible && (
          <Space.Compact style={{ width: '100%', marginTop: 8 }}>
            <Input
              size="small"
              value={imgUrlInput}
              onChange={(e) => setImgUrlInput(e.target.value)}
              placeholder="https://example.com/image.png"
              onPressEnter={handleInsertImgUrl}
            />
            <Button size="small" type="primary" onClick={handleInsertImgUrl}>确定</Button>
          </Space.Compact>
        )}
      </div>
    </Modal>
  );
};

export default InsertTableModal;
