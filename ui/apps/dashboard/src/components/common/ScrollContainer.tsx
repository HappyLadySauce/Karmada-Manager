import React, { ReactNode } from 'react';
import { FloatButton } from 'antd';
import { VerticalAlignTopOutlined } from '@ant-design/icons';

interface ScrollContainerProps {
  children: ReactNode;
  className?: string;
  style?: React.CSSProperties;
  showBackTop?: boolean;
  height?: string;
  padding?: string;
  background?: string;
}

const ScrollContainer: React.FC<ScrollContainerProps> = ({
  children,
  className = '',
  style = {},
  showBackTop = true,
  height = '100vh',
  padding = '24px',
  background = '#f0f2f5',
}) => {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  return (
    <div
      ref={scrollContainerRef}
      className={`custom-scroll-container ${className}`}
      style={{
        height,
        overflowY: 'auto',
        overflowX: 'hidden',
        padding,
        background,
        position: 'relative',
        ...style,
      }}
    >
      {/* 自定义滚动条样式 */}
      <style>{`
        .custom-scroll-container {
          scrollbar-width: thin;
          scrollbar-color: var(--tech-primary) rgba(0, 0, 0, 0.1);
        }
        
        .custom-scroll-container::-webkit-scrollbar {
          width: 12px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 6px;
        }
        
        .custom-scroll-container::-webkit-scrollbar-track {
          background: linear-gradient(180deg, rgba(240, 242, 245, 0.8) 0%, rgba(240, 242, 245, 0.6) 100%);
          border-radius: 6px;
          margin: 4px 0;
          border: 1px solid var(--glow-border);
          backdrop-filter: blur(4px);
        }
        
        .custom-scroll-container::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, var(--tech-primary) 0%, var(--tech-primary-4) 50%, var(--tech-primary-3) 100%);
          border-radius: 6px;
          border: 2px solid rgba(255, 255, 255, 0.8);
          transition: all 0.3s ease;
          box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
        }
        
        .custom-scroll-container::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, var(--tech-primary-7) 0%, var(--tech-primary) 50%, var(--tech-primary-4) 100%);
          border: 2px solid rgba(255, 255, 255, 0.9);
          box-shadow: 0 4px 12px rgba(64, 158, 255, 0.5);
        }
        
        .custom-scroll-container::-webkit-scrollbar-thumb:active {
          background: linear-gradient(180deg, var(--tech-primary-8) 0%, var(--tech-primary-7) 50%, var(--tech-primary) 100%);
          box-shadow: 0 2px 6px rgba(64, 158, 255, 0.7);
        }
        
        /* 添加滚动条角落样式 */
        .custom-scroll-container::-webkit-scrollbar-corner {
          background: rgba(240, 242, 245, 0.8);
          border-radius: 6px;
        }
        
        /* 滚动时添加动画效果 */
        .custom-scroll-container {
          scroll-behavior: smooth;
        }
        
        /* 科技感滚动发光效果 */
        .custom-scroll-container::-webkit-scrollbar-thumb:hover {
          animation: techScrollGlow 2s ease-in-out infinite;
        }
        
        @keyframes techScrollGlow {
          0%, 100% {
            box-shadow: 0 4px 12px rgba(64, 158, 255, 0.5);
          }
          50% {
            box-shadow: 0 4px 16px rgba(64, 158, 255, 0.8), 0 0 20px rgba(64, 158, 255, 0.4);
          }
        }
        
        /* 为滚动条添加阴影效果 */
        .custom-scroll-container::-webkit-scrollbar-track:active {
          background: linear-gradient(180deg, rgba(240, 242, 245, 0.9) 0%, rgba(240, 242, 245, 0.7) 100%);
        }

        /* Dark theme support */
        @media (prefers-color-scheme: dark) {
          .custom-scroll-container::-webkit-scrollbar-track {
            background: linear-gradient(180deg, rgba(45, 47, 51, 0.8) 0%, rgba(45, 47, 51, 0.6) 100%);
            border: 1px solid rgba(255, 255, 255, 0.1);
          }
          
          .custom-scroll-container::-webkit-scrollbar-corner {
            background: rgba(45, 47, 51, 0.8);
          }
        }
        
        /* 响应式设计 - 移动端优化 */
        @media (max-width: 768px) {
          .custom-scroll-container::-webkit-scrollbar {
            width: 8px;
          }
        }
      `}</style>

      {children}

      {/* 科技感回到顶部按钮 */}
      {showBackTop && (
        <>
          <style>{`
            .tech-back-top-btn:hover {
              background: linear-gradient(45deg, var(--tech-primary) 0%, var(--tech-primary-4) 100%) !important;
              box-shadow: 0 6px 20px rgba(64, 158, 255, 0.6), 0 0 30px rgba(64, 158, 255, 0.3) !important;
              transform: translateY(-2px) scale(1.05) !important;
            }
            
            .tech-back-top-btn:active {
              transform: translateY(0) scale(0.95) !important;
              box-shadow: 0 2px 8px rgba(64, 158, 255, 0.4) !important;
            }
          `}</style>
          <FloatButton.BackTop
            className="tech-back-top-btn"
            style={{
              height: 48,
              width: 48,
              lineHeight: '48px',
              borderRadius: '24px',
              backgroundColor: 'var(--tech-primary)',
              color: 'white',
              fontSize: '20px',
              boxShadow: '0 4px 12px rgba(64, 158, 255, 0.4)',
              border: '2px solid rgba(255, 255, 255, 0.8)',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
            target={() => scrollContainerRef.current as HTMLElement}
            onClick={() => {
              // 添加科技感点击动画效果
              const backTopElement = document.querySelector('.tech-back-top-btn') as HTMLElement;
              if (backTopElement) {
                backTopElement.style.transform = 'translateY(0) scale(0.9)';
                backTopElement.style.boxShadow = '0 2px 8px rgba(64, 158, 255, 0.6), 0 0 15px rgba(64, 158, 255, 0.4)';
                setTimeout(() => {
                  backTopElement.style.transform = 'translateY(-2px) scale(1)';
                  backTopElement.style.boxShadow = '0 4px 12px rgba(64, 158, 255, 0.4)';
                }, 150);
              }
            }}
            icon={<VerticalAlignTopOutlined />}
          />
        </>
      )}
    </div>
  );
};

export default ScrollContainer; 