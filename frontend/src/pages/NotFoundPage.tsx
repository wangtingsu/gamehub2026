import { Result, Button } from 'antd';
import { useNavigate } from 'react-router-dom';
import SEO from '../components/SEO';

const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <SEO
        title="404 - 页面不存在 | GameHub"
        description="抱歉，您访问的页面不存在。"
        keywords="404, 页面不存在, 找不到页面, 页面错误, 链接失效"
        noindex
      />
      <Result
        status="404"
        title="404"
        subTitle="抱歉，您访问的页面不存在。"
        extra={
          <Button type="primary" onClick={() => navigate('/')}>
            返回首页
          </Button>
        }
      />
    </div>
  );
};

export default NotFoundPage;