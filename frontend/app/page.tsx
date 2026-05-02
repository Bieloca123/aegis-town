'use client'
import Link from 'next/link'
import Image from 'next/image'
import BasicButton from '@/components/BasicButton'

export default function Index() {
  return (
    <div className='w-full grid place-items-center h-screen gradient p-4 relative overflow-hidden'>
      <div className='max-w-[640px] flex flex-col items-center text-center relative z-10'>
        <Image
          src='/brand/athena-mark-light.png'
          alt='Athena Growth'
          width={120}
          height={120}
          priority
          className='mb-6 opacity-95'
        />
        <h1 className='font-semibold text-5xl tracking-tight'>Bem-vindo a Aegis City</h1>
        <p className='text-base sm:text-lg my-6 opacity-75 leading-relaxed'>
          O espaço virtual da Athena Growth — chama na Athena que resolve o problema.
        </p>
        <Link href='/app'>
          <BasicButton>
            Entrar
          </BasicButton>
        </Link>
        <p className='mt-8 text-xs opacity-50'>Ambiente interno · Athena Growth Marketing</p>
      </div>
    </div>
  )
}
