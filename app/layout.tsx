import type {Metadata} from 'next';
import './globals.css';
export const metadata:Metadata={title:'KnowBalledge — Prove you know ball',description:'One mystery player. Five clues. How well do you really know football? Pick an era and play the football guessing game.',icons:{icon:'/favicon.svg',shortcut:'/favicon.svg'}};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
