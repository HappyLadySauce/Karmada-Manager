/*
Copyright 2024 The Karmada Authors.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
*/

import React from 'react';
import { Typography, Progress } from 'antd';
import '@/styles/tech-theme.css';

const { Title, Text } = Typography;

interface KarmadaLoadingProps {
  message?: string;
  description?: string;
  progress?: number;
  showProgress?: boolean;
}

const KarmadaLoading: React.FC<KarmadaLoadingProps> = ({ 
  message = "正在连接 Karmada", 
  description = "多集群管理平台正在初始化...",
  progress = 0,
  showProgress = false
}) => {
  return (
    <div className="karmada-loading-container">
      {/* 科技背景 */}
      <div className="tech-background">
        {/* 粒子效果 */}
        <div className="tech-particles-container">
          {Array.from({ length: 30 }, (_, i) => (
            <div
              key={i}
              className="tech-particle"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 10}s`,
                animationDuration: `${8 + Math.random() * 12}s`
              }}
            />
          ))}
        </div>
      </div>

      {/* 主要内容 */}
      <div className="karmada-loading-content">
        <div className="background-pattern"></div>
        {/* Logo 和标题 */}
        <div className="karmada-loading-header">
          <div className="karmada-logo-container">
            <div className="karmada-logo">
              <div className="logo-hexagon">
                <div className="hexagon-inner">
                  <span className="logo-text">K</span>
                </div>
              </div>
            </div>
            <div className="logo-rings">
              <div className="ring ring-1"></div>
              <div className="ring ring-2"></div>
              <div className="ring ring-3"></div>
            </div>
          </div>
          
          <Title 
            level={1} 
            className="tech-hologram-text karmada-title"
            style={{ marginTop: 32, marginBottom: 8 }}
          >
            KARMADA
          </Title>
          
          <Text 
            className="karmada-subtitle"
            style={{ fontSize: '18px', color: 'rgba(255, 255, 255, 0.8)' }}
          >
            Multi-Cloud Management Platform
          </Text>
        </div>

        {/* 加载指示器 */}
        <div className="karmada-loading-indicator">
          <div className="tech-loading-spinner-large">
            <div className="spinner-orbit orbit-1"></div>
            <div className="spinner-orbit orbit-2"></div>
            <div className="spinner-orbit orbit-3"></div>
            <div className="spinner-center"></div>
          </div>
        </div>

        {/* 加载信息 */}
        <div className="karmada-loading-info">
          <Title level={4} style={{ 
            color: 'var(--tech-primary)', 
            marginBottom: 16,
            fontSize: '26px',
            fontWeight: 600,
            letterSpacing: '2px'
          }}>
            {message}
          </Title>
          <Text style={{ 
            color: 'rgba(100, 100, 100, 0.8)', 
            fontSize: '18px',
            lineHeight: '1.6',
            letterSpacing: '1px'
          }}>
            {description}
          </Text>
          <div className="loading-sparkles">
            <span className="sparkle sparkle-1">✨</span>
            <span className="sparkle sparkle-2">✨</span>
            <span className="sparkle sparkle-3">✨</span>
          </div>
        </div>

        {/* 进度条 (可选) */}
        {showProgress && (
          <div className="karmada-loading-progress">
            <Progress
              percent={progress}
              strokeColor={{
                '0%': 'var(--tech-primary)',
                '50%': '#40a9ff',
                '100%': '#73d13d',
              }}
              trailColor="rgba(200, 200, 200, 0.2)"
              size="small"
              showInfo={false}
              style={{ width: '240px' }}
            />
            <Text style={{ color: 'rgba(150, 150, 150, 0.8)', fontSize: '12px', marginTop: 8 }}>
              {progress}%
            </Text>
          </div>
        )}

        {/* 状态点 */}
        <div className="karmada-status-dots">
          <div className="status-dot active"></div>
          <div className="status-dot active"></div>
          <div className="status-dot active"></div>
          <div className="status-dot loading"></div>
          <div className="status-dot"></div>
        </div>
      </div>

      <style>{`
        .karmada-loading-container {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(8px);
          z-index: 9999;
          overflow: hidden;
        }

        .karmada-loading-content {
          background: linear-gradient(135deg, #ffffff 0%, #fafbff 100%);
          border-radius: 12px;
          box-shadow: 
            0 15px 40px rgba(64, 158, 255, 0.12),
            0 6px 20px rgba(0, 0, 0, 0.08),
            inset 0 1px 0 rgba(255, 255, 255, 0.8);
          text-align: center;
          z-index: 2;
          max-width: 1100px;
          min-width: 1000px;
          min-height: 320px;
          padding: 40px 80px;
          border: 1px solid rgba(64, 158, 255, 0.2);
          display: flex;
          flex-direction: column;
          justify-content: center;
          backdrop-filter: blur(20px);
          position: relative;
          overflow: hidden;
        }

        .karmada-loading-content::before {
          content: '';
          position: absolute;
          top: 0;
          left: 40px;
          right: 40px;
          height: 3px;
          background: linear-gradient(90deg, transparent, rgba(64, 158, 255, 0.9), rgba(115, 209, 61, 0.7), rgba(64, 158, 255, 0.9), transparent);
          animation: shimmer 2s ease-in-out infinite;
          border-radius: 1.5px;
        }

        .karmada-loading-content .background-pattern {
          content: '';
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          background: conic-gradient(
            from 0deg,
            transparent,
            rgba(64, 158, 255, 0.03),
            transparent 120deg
          );
          animation: rotate 8s linear infinite;
          z-index: -1;
          pointer-events: none;
        }

        @keyframes shimmer {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }

        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .karmada-loading-content::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 40px;
          right: 40px;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(64, 158, 255, 0.6), rgba(115, 209, 61, 0.4), rgba(64, 158, 255, 0.6), transparent);
          border-radius: 1px;
        }

        .karmada-loading-content:hover {
          transform: translateY(-2px);
          box-shadow: 
            0 25px 80px rgba(64, 158, 255, 0.2),
            0 12px 40px rgba(0, 0, 0, 0.15),
            inset 0 1px 0 rgba(255, 255, 255, 0.9);
          transition: all 0.3s ease;
        }

        .karmada-loading-header {
          margin-bottom: 44px;
        }

        .karmada-logo-container {
          position: relative;
          display: inline-block;
        }

        .karmada-logo {
          position: relative;
          z-index: 2;
        }

        .logo-hexagon {
          width: 56px;
          height: 56px;
          background: linear-gradient(135deg, var(--tech-primary), #40a9ff, #73d13d);
          position: relative;
          transform: rotate(30deg);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 
            0 0 20px rgba(64, 158, 255, 0.4),
            0 4px 12px rgba(64, 158, 255, 0.2),
            inset 0 0 10px rgba(255, 255, 255, 0.2);
          animation: logoFloat 3s ease-in-out infinite;
          border: 1px solid rgba(255, 255, 255, 0.3);
        }

        .hexagon-inner {
          transform: rotate(-30deg);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .logo-text {
          font-size: 22px;
          font-weight: bold;
          color: white;
          text-shadow: 0 0 5px rgba(255, 255, 255, 0.5);
        }

        .logo-rings {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 1;
        }

        .ring {
          position: absolute;
          border: 1px solid transparent;
          border-top-color: rgba(64, 158, 255, 0.3);
          border-radius: 50%;
          animation: ringRotate 2s linear infinite;
        }

        .ring-1 {
          width: 80px;
          height: 80px;
          top: -40px;
          left: -40px;
          opacity: 0.6;
        }

        .ring-2 {
          width: 108px;
          height: 108px;
          top: -54px;
          left: -54px;
          opacity: 0.4;
          animation-duration: 3s;
          animation-direction: reverse;
        }

        .ring-3 {
          width: 200px;
          height: 200px;
          top: -100px;
          left: -100px;
          opacity: 0.2;
          animation-duration: 4s;
        }

        .karmada-title {
          letter-spacing: 8px;
          font-size: 48px !important;
          margin: 16px 0 10px 0 !important;
          color: var(--tech-primary) !important;
          font-weight: 700 !important;
          text-shadow: 0 3px 6px rgba(64, 158, 255, 0.3);
        }

        .karmada-subtitle {
          display: block;
          letter-spacing: 6px;
          text-transform: uppercase;
          opacity: 0.7;
          font-size: 20px;
          color: #555;
          font-weight: 500;
        }

        .karmada-loading-indicator {
          margin: 36px 0;
        }

        .tech-loading-spinner-large {
          width: 72px;
          height: 72px;
          position: relative;
          margin: 0 auto;
        }

        .spinner-orbit {
          position: absolute;
          border: 2px solid transparent;
          border-radius: 50%;
          animation: orbitSpin 2s linear infinite;
        }

        .orbit-1 {
          width: 100%;
          height: 100%;
          border-top-color: var(--tech-primary);
          border-bottom-color: var(--tech-primary);
          animation-duration: 2s;
        }

        .orbit-2 {
          width: 70%;
          height: 70%;
          top: 15%;
          left: 15%;
          border-left-color: #40a9ff;
          border-right-color: #40a9ff;
          animation-duration: 1.5s;
          animation-direction: reverse;
        }

        .orbit-3 {
          width: 40%;
          height: 40%;
          top: 30%;
          left: 30%;
          border-top-color: #73d13d;
          border-bottom-color: #73d13d;
          animation-duration: 1s;
        }

        .spinner-center {
          position: absolute;
          width: 20%;
          height: 20%;
          top: 40%;
          left: 40%;
          background: var(--tech-primary);
          border-radius: 50%;
          box-shadow: 0 0 15px var(--tech-primary);
          animation: centerPulse 1s ease-in-out infinite alternate;
        }

        .karmada-loading-info {
          margin: 32px 0;
          padding: 24px 80px;
          background: linear-gradient(135deg, rgba(64, 158, 255, 0.05), rgba(115, 209, 61, 0.03));
          border-radius: 20px;
          border: 1px solid rgba(64, 158, 255, 0.15);
          position: relative;
          backdrop-filter: blur(10px);
        }

        .karmada-loading-info::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(64, 158, 255, 0.4), transparent);
        }

        .loading-sparkles {
          position: absolute;
          top: -10px;
          right: -10px;
          pointer-events: none;
        }

        .sparkle {
          position: absolute;
          font-size: 12px;
          animation: sparkleFloat 3s ease-in-out infinite;
          opacity: 0.7;
        }

        .sparkle-1 {
          top: 0;
          right: 0;
          animation-delay: 0s;
        }

        .sparkle-2 {
          top: 15px;
          right: 20px;
          animation-delay: 1s;
        }

        .sparkle-3 {
          top: -5px;
          right: 25px;
          animation-delay: 2s;
        }

        @keyframes sparkleFloat {
          0%, 100% { 
            transform: translateY(0px) rotate(0deg);
            opacity: 0.7;
          }
          50% { 
            transform: translateY(-8px) rotate(180deg);
            opacity: 1;
          }
        }

        .karmada-loading-progress {
          margin: 16px 0;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .karmada-status-dots {
          display: flex;
          justify-content: center;
          gap: 32px;
          margin-top: 40px;
          padding: 20px 120px;
          background: rgba(255, 255, 255, 0.6);
          border-radius: 30px;
          backdrop-filter: blur(10px);
          border: 1px solid rgba(64, 158, 255, 0.1);
        }

        .status-dot {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: rgba(200, 200, 200, 0.4);
          transition: all 0.4s ease;
          position: relative;
        }

        .status-dot.active {
          background: linear-gradient(135deg, var(--tech-primary), #40a9ff);
          box-shadow: 
            0 0 12px rgba(64, 158, 255, 0.5),
            0 2px 6px rgba(64, 158, 255, 0.3);
          transform: scale(1.2);
        }

        .status-dot.loading {
          background: linear-gradient(135deg, #40a9ff, #73d13d);
          animation: dotPulse 1.2s ease-in-out infinite;
          box-shadow: 0 0 15px rgba(64, 158, 255, 0.6);
        }

        @keyframes logoFloat {
          0%, 100% { transform: rotate(30deg) translateY(0px); }
          50% { transform: rotate(30deg) translateY(-10px); }
        }

        @keyframes ringRotate {
          0% { transform: translate(-50%, -50%) rotate(0deg); }
          100% { transform: translate(-50%, -50%) rotate(360deg); }
        }

        @keyframes orbitSpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes centerPulse {
          0% { 
            transform: scale(1);
            box-shadow: 0 0 15px var(--tech-primary);
          }
          100% { 
            transform: scale(1.2);
            box-shadow: 0 0 25px var(--tech-primary);
          }
        }

        @keyframes dotPulse {
          0%, 100% { 
            opacity: 1; 
            transform: scale(1.2);
            box-shadow: 0 0 15px rgba(64, 158, 255, 0.6);
          }
          50% { 
            opacity: 0.7; 
            transform: scale(1.5);
            box-shadow: 0 0 25px rgba(64, 158, 255, 0.8);
          }
        }
      `}</style>
    </div>
  );
};

export default KarmadaLoading; 