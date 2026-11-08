import Link from 'next/link';
export default function NotFound(){return <main style={{padding:48,maxWidth:760,margin:'auto'}}><h1>Page not found</h1><p>The page you requested is not available.</p><Link href="/courses" style={{color:'#167765'}}>Explore courses →</Link></main>;}
