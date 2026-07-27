/**
 * FlagIcon 组件的属性类型定义
 *
 * @property country - 国家代码（如 "US"、"CN"、"JP" 等），用于匹配对应的国旗 SVG
 * @property className - 自定义 CSS 类名（可选），用于控制图标大小和样式，默认 "w-5 h-5"
 */
interface FlagIconProps {
  country: string;
  className?: string;
}

/**
 * 国旗 SVG 映射表
 * 以国家代码为键，存储对应的内联 SVG 字符串。
 * 目前支持：美国 (US)、中国 (CN)、日本 (JP)、韩国 (KR)、西班牙 (ES)、法国 (FR)
 */
const flags: Record<string, string> = {
  US: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><g transform="translate(0,-16)"><defs><clipPath id="us-clip"><path d="M0-16h640v480H0z"/></clipPath></defs><g clip-path="url(#us-clip)"><path fill="#fff" d="M0-16h640v480H0z"/><path fill="#b22234" d="M0-16h640v27.7H0zm0 55.4h640v27.7H0zm0 55.4h640v27.7H0zm0 55.4h640v27.7H0zm0 55.3h640v27.7H0zm0 55.4h640v27.7H0zm0 55.4h640v27.7H0zm0 55.4h640v27.7H0z"/><path fill="#3c3b6e" d="M0-16h296.9v249.3H0z"/><g fill="#fff"><g id="us-star"><path d="M21.5-3l3.3 10.2h10.8L27.5 13.6l3.3 10.2-8.6-6.2-8.6 6.2 3.3-10.2L7.5 7.3h10.8z"/></g><use href="#us-star" x="42.3" y="18.5"/><use href="#us-star" x="84.6" y="18.5"/><use href="#us-star" x="127" y="18.5"/><use href="#us-star" x="169.3" y="18.5"/><use href="#us-star" x="211.6" y="18.5"/><use href="#us-star" x="21.2" y="46.2"/><use href="#us-star" x="63.5" y="46.2"/><use href="#us-star" x="105.8" y="46.2"/><use href="#us-star" x="148.1" y="46.2"/><use href="#us-star" x="190.4" y="46.2"/><use href="#us-star" x="232.7" y="46.2"/><use href="#us-star" x="42.3" y="73.9"/><use href="#us-star" x="84.6" y="73.9"/><use href="#us-star" x="127" y="73.9"/><use href="#us-star" x="169.3" y="73.9"/><use href="#us-star" x="211.6" y="73.9"/><use href="#us-star" x="21.2" y="101.6"/><use href="#us-star" x="63.5" y="101.6"/><use href="#us-star" x="105.8" y="101.6"/><use href="#us-star" x="148.1" y="101.6"/><use href="#us-star" x="190.4" y="101.6"/><use href="#us-star" x="232.7" y="101.6"/><use href="#us-star" x="42.3" y="129.3"/><use href="#us-star" x="84.6" y="129.3"/><use href="#us-star" x="127" y="129.3"/><use href="#us-star" x="169.3" y="129.3"/><use href="#us-star" x="211.6" y="129.3"/></g></g></svg>`,
  CN: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><defs><path id="cn-a" fill="#ffde00" d="M-6-.5L0-5l6 3.5-2 6.5z"/></defs><path fill="#de2910" d="M0 0h640v480H0z"/><use href="#cn-a" x="96" y="64" transform="scale(2)" transform-origin="96 64"/><use href="#cn-a" x="160" y="96" transform="scale(.5) rotate(45 160 96)"/><use href="#cn-a" x="192" y="64" transform="scale(.5) rotate(15 192 64)"/><use href="#cn-a" x="192" y="128" transform="scale(.5) rotate(-15 192 128)"/><use href="#cn-a" x="160" y="160" transform="scale(.5) rotate(-45 160 160)"/></svg>`,
  JP: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><path fill="#fff" d="M0 0h640v480H0z"/><circle cx="320" cy="240" r="108" fill="#bc002d"/></svg>`,
  KR: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><g fill-rule="evenodd"><path fill="#fff" d="M0 0h640v480H0z"/><g fill-rule="nonzero"><path fill="#cd2e3a" d="M320 64l22.5 22.5L320 109l-22.5-22.5z"/><path fill="#0047a0" d="M320 416l22.5-22.5L320 371l-22.5 22.5z"/></g><g fill-rule="nonzero"><path fill="#cd2e3a" d="M96 256l22.5-22.5L141 256l-22.5 22.5z"/><path fill="#0047a0" d="M544 256l22.5-22.5L589 256l-22.5 22.5z"/></g><g><g><path fill="#000" d="M320 224.4a15.6 15.6 0 110 31.2 15.6 15.6 0 010-31.2z"/><path fill="#cd2e3a" d="M320 199.9a40 40 0 01-28.3 68.3A40 40 0 01320 199.9z"/><path fill="#0047a0" d="M320 215.6a24.4 24.4 0 110 48.8 24.4 24.4 0 010-48.8z"/></g><path fill="#000" d="M240 168l13.4 13.4-13.4 13.4-13.4-13.4z"/><path fill="#cd2e3a" d="M400 312l13.4 13.4-13.4 13.4-13.4-13.4z"/></g><g fill-rule="nonzero"><path fill="#000" d="M320 48l4.5 13.8h14.6l-11.8 8.6 4.5 13.8L320 75.5l-11.8 8.6 4.5-13.8-11.8-8.6h14.6z"/><path fill="#cd2e3a" d="M320 432l4.5-13.8h14.6l-11.8-8.6 4.5-13.8L320 404.5l-11.8-8.6 4.5 13.8-11.8 8.6h14.6z"/></g></g></svg>`,
  ES: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><g fill-rule="evenodd"><path fill="#c60b1e" d="M0 0h640v480H0z"/><path fill="#ffc400" d="M0 120h640v240H0z"/><path d="M0 0h640v60H0zm0 420h640v60H0z" fill="#c60b1e"/></g></svg>`,
  FR: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 480"><g fill-rule="evenodd"><path fill="#fff" d="M0 0h640v480H0z"/><path fill="#002654" d="M0 0h213.3v480H0z"/><path fill="#ce1126" d="M426.7 0H640v480H426.7z"/></g></svg>`,
};

/**
 * FlagIcon 组件
 *
 * 用于渲染对应国家的国旗图标。以国家代码为标识，从 flags 映射表中查找对应的内联 SVG
 * 并通过 dangerouslySetInnerHTML 渲染。图标默认尺寸为 w-5 h-5（20px），可通过 className 自定义。
 *
 * @param props.country - 国家代码（如 "US"、"CN"、"JP"、"KR"、"ES"、"FR"）
 * @param props.className - 自定义 CSS 类名（可选），用于控制图标尺寸和样式
 *
 * @example
 * <FlagIcon country="US" />           // 渲染美国国旗，默认尺寸
 * <FlagIcon country="CN" className="w-8 h-8" />  // 渲染中国国旗，自定义尺寸
 */
const FlagIcon = ({ country, className = 'w-5 h-5' }: FlagIconProps) => (
  <span
    className={`inline-block ${className} rounded-sm overflow-hidden`}
    dangerouslySetInnerHTML={{ __html: flags[country] || '' }}
  />
);

export default FlagIcon;
