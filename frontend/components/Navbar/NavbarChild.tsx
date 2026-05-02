'use client'
import React from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { PlusCircleIcon } from '@heroicons/react/24/outline'
import { useModal } from '@/app/hooks/useModal'
import BasicButton from '../BasicButton'

type NavbarChildProps = {
    name: string,
    avatar_url: string
}

export const NavbarChild:React.FC<NavbarChildProps> = ({ name, avatar_url }) => {

    const { setModal } = useModal()

    return (
        <div className='h-16'>
            <div className='w-full fixed bg-secondary border-b border-light-gray/40 flex flex-row items-center px-4 sm:px-6 justify-between z-10'>
                <Link href='/app' className='flex flex-row items-center gap-3 hover:opacity-80 animate-colors'>
                    <Image
                      src='/brand/athena-mark-light.png'
                      alt='Athena Growth'
                      width={36}
                      height={36}
                      priority
                    />
                    <span className='hidden sm:inline text-sm font-semibold tracking-tight opacity-90'>Athena Growth</span>
                </Link>
                <div className='flex flex-row items-center gap-3'>
                    <BasicButton onClick={() => setModal('Create Realm')} className='hidden sm:flex flex-row items-center gap-2 py-[10px]'>
                        Nova Sala
                        <PlusCircleIcon className='h-5'/>
                    </BasicButton>
                    <div className='flex flex-row items-center gap-3 hover:bg-light-secondary animate-colors rounded-full cursor-pointer py-1 px-1 select-none' onClick={() => setModal('Account Dropdown')}>
                        <p className='hidden sm:block text-sm opacity-90'>{name}</p>
                        <Image alt='avatar' src={avatar_url} width={40} height={40} className='aspect-square rounded-full' />
                    </div>
                </div>
            </div>
        </div>
    )
}
