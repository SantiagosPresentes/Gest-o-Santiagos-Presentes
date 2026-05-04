import { useState, useEffect } from 'react'
import { supabase } from '../supabase'

function Estoque() {
  const [produtos, setProdutos] = useState([])

  useEffect(() => {
    carregarProdutos()
  }, [])

  async function carregarProdutos() {
    const { data } = await supabase.from('produtos').select('*').order('nome')
    if (data) setProdutos(data)
  }

  return (
    <div>
      <h2>Estoque</h2>
      <div style={{background:'white', borderRadius:'12px', marginTop:'16px', boxShadow:'0 2px 8px rgba(0,0,0,0.1)', overflow:'hidden'}}>
        <table style={{width:'100%', borderCollapse:'collapse'}}>
          <thead>
            <tr style={{background:'#1a1a2e', color:'white'}}>
              <th style={{padding:'14px 16px', textAlign:'left'}}>Código</th>
              <th style={{padding:'14px 16px', textAlign:'left'}}>Produto</th>
              <th style={{padding:'14px 16px', textAlign:'left'}}>Categoria</th>
              <th style={{padding:'14px 16px', textAlign:'center'}}>Estoque</th>
              <th style={{padding:'14px 16px', textAlign:'right'}}>Preço Unit.</th>
              <th style={{padding:'14px 16px', textAlign:'right'}}>Total em Estoque</th>
            </tr>
          </thead>
          <tbody>
            {produtos.map((p, i) => (
              <tr key={p.id} style={{background: i % 2 === 0 ? '#fff' : '#f9f9f9', borderBottom:'1px solid #eee'}}>
                <td style={{padding:'12px 16px'}}>{p.codigo}</td>
                <td style={{padding:'12px 16px'}}><strong>{p.nome}</strong></td>
                <td style={{padding:'12px 16px'}}>{p.categoria}</td>
                <td style={{padding:'12px 16px', textAlign:'center'}}>
                  <span style={{background: p.estoque > 0 ? '#e8f5e9' : '#ffebee', color: p.estoque > 0 ? 'green' : 'red', padding:'4px 12px', borderRadius:'20px', fontWeight:'bold'}}>
                    {p.estoque}
                  </span>
                </td>
                <td style={{padding:'12px 16px', textAlign:'right'}}>R$ {parseFloat(p.preco_venda).toFixed(2)}</td>
                <td style={{padding:'12px 16px', textAlign:'right'}}><strong>R$ {(p.estoque * parseFloat(p.preco_venda)).toFixed(2)}</strong></td>
              </tr>
            ))}
          </tbody>
        </table>
        {produtos.length === 0 && <p style={{textAlign:'center', padding:'32px', color:'#aaa'}}>Nenhum produto cadastrado</p>}
      </div>
    </div>
  )
}

export default Estoque