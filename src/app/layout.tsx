import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'여행의 결 | 나만의 여행 가이드북',description:'취향을 따라 계획하고, 한 권으로 간직하는 여행. 나만의 API 키로 만드는 맞춤 여행 가이드북.'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="ko"><body>{children}</body></html>}
