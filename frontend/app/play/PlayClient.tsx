'use client'
import React, { useEffect, useState } from 'react'
import PixiApp from './PixiApp'
import { RealmData } from '@/utils/pixi/types'
import PlayNavbar from './PlayNavbar'
import { useModal } from '../hooks/useModal'
import signal from '@/utils/signal'
import IntroScreen from './IntroScreen'
import VideoBar from '@/components/VideoChat/VideoBar'
import { AgoraVideoChatProvider } from '../hooks/useVideoChat'
import { Status } from './StatusDropdown'

type PlayClientProps = {
    mapData: RealmData
    username: string
    access_token: string
    realmId: string
    uid: string
    shareId: string
    initialSkin: string
    name: string
    initialStatus: Status
}

const PlayClient:React.FC<PlayClientProps> = ({ mapData, username, access_token, realmId, uid, shareId, initialSkin, name, initialStatus }) => {

    const { setErrorModal, setDisconnectedMessage } = useModal()

    const [showIntroScreen, setShowIntroScreen] = useState(true)

    const [skin, setSkin] = useState(initialSkin)

    useEffect(() => {
        const onShowKickedModal = (message: string) => { 
            setErrorModal('Disconnected')
            setDisconnectedMessage(message)
        }

        const onShowDisconnectModal = () => {
            setErrorModal('Disconnected')
            setDisconnectedMessage('You have been disconnected from the server.')
        }

        const onSwitchSkin = (skin: string) => {
            setSkin(skin)
        }

        signal.on('showKickedModal', onShowKickedModal)
        signal.on('showDisconnectModal', onShowDisconnectModal)
        signal.on('switchSkin', onSwitchSkin)

        return () => {
            signal.off('showKickedModal', onShowDisconnectModal)
            signal.off('showDisconnectModal', onShowDisconnectModal)
            signal.off('switchSkin', onSwitchSkin)
        }
    }, [])

    return (
        <AgoraVideoChatProvider uid={uid}>
            {!showIntroScreen && <div className='relative w-full h-screen flex flex-col-reverse sm:flex-col'>
                <VideoBar />
                <PixiApp 
                    mapData={mapData} 
                    className='w-full grow sm:h-full sm:flex-grow-0' 
                    username={username} 
                    access_token={access_token} 
                    realmId={realmId} 
                    uid={uid} 
                    shareId={shareId} 
                    initialSkin={skin} 
                />
                <PlayNavbar username={username} skin={skin} initialStatus={initialStatus}/>
            </div>}
            {showIntroScreen && <IntroScreen realmName={name} skin={skin} username={username} setShowIntroScreen={setShowIntroScreen}/>}    
        </AgoraVideoChatProvider>
    )
}
export default PlayClient