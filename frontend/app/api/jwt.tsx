import React, { Component } from 'react';

// 带有静态属性的组件类型
interface WithDisplayName {
  displayName?: string;
}

// 身份验证高阶组件
function withAuthentication(WrappedComponent: React.ComponentType) {
  // 返回一个新的组件类
  class AuthComponent extends Component {
    static displayName: string;
    
    render() {
      const token = localStorage.getItem('token'); // 假设token存储在localStorage中

      if (!token) { // 如果没有token，则重定向到登录页面
        // 这里使用了一个简单的重定向逻辑，您可能需要根据实际路由配置进行调整
        window.location.href = '/login';
        return null;
      }

      // 如果有token，渲染原始组件
      return <WrappedComponent {...this.props} />;
    }
  }
  
  // 设置displayName
  AuthComponent.displayName = `WithAuthentication(${getDisplayName(WrappedComponent)})`;
  
  return AuthComponent;
}

// 获取组件的displayName
function getDisplayName(WrappedComponent: React.ComponentType) {
  return WrappedComponent.displayName || WrappedComponent.name || 'Component';
}

export default withAuthentication;