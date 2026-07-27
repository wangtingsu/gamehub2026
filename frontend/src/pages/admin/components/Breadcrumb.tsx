import React from 'react';
import { Breadcrumb as AntBreadcrumb } from 'antd';
import { useLocation, Link } from 'react-router-dom';
import { HomeOutlined } from '@ant-design/icons';

const breadcrumbNameMap: Record<string, string> = {
  '/admin/dashboard': 'Dashboard',
  '/admin/users': 'Users',
  '/admin/games': 'Games',
  '/admin/content': 'Content',
  '/admin/content/news': 'News',
  '/admin/content/reviews': 'Reviews',
  '/admin/content/community': 'Community',
  '/admin/settings': 'Settings',
};

const Breadcrumb: React.FC = () => {
  const location = useLocation();
  const pathSnippets = location.pathname.split('/').filter((i) => i);

  const extraBreadcrumbItems = pathSnippets.map((_, index) => {
    const url = `/${pathSnippets.slice(0, index + 1).join('/')}`;
    const isLast = index === pathSnippets.length - 1;

    return {
      key: url,
      title: isLast ? (
        <span className="text-primary-600 font-medium">
          {breadcrumbNameMap[url] || url.replace('/admin/', '').charAt(0).toUpperCase() + url.replace('/admin/', '').slice(1)}
        </span>
      ) : (
        <Link to={url} className="text-gray-600 hover:text-primary-500">
          {breadcrumbNameMap[url] || url.replace('/admin/', '').charAt(0).toUpperCase() + url.replace('/admin/', '').slice(1)}
        </Link>
      ),
    };
  });

  const breadcrumbItems = [
    {
      title: (
        <Link to="/admin/dashboard" className="text-gray-600 hover:text-primary-500">
          <HomeOutlined /> Home
        </Link>
      ),
      key: 'home',
    },
    ...extraBreadcrumbItems,
  ];

  return <AntBreadcrumb items={breadcrumbItems} className="mb-0" />;
};

export default Breadcrumb;