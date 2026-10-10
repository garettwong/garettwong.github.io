.setcpu "6502"
.segment "CODE"
.export palette_restore, palette_allocate
palette_restore:
 lda $73B6
 cmp #$A9
 bne no_restore
 lda $73B7
 cmp #$51
 bne no_restore
 lda $2e
 cmp #6
 bne clear
 lda $0114
 cmp #$38
 bne clear
 lda $0115
 cmp #$0f
 bne clear
 lda $0116
 cmp #$27
 bne clear
 ldx #2
restore_loop:
 lda $73B8,x
 sta $0114,x
 dex
 bpl restore_loop
 lda #$ff
 sta $0100
clear:
 lda #0
 sta $73B6
 sta $73B7
no_restore:
 lda $2e
 cmp #6
 jmp $8298
palette_allocate:
 ; Only reuse palette2 when no visible native sprite owns it.
 ldx #0
scan:
 cpx $38
 bcs available
 lda $0700,x
 cmp #$ef
 bcs next
 lda $0702,x
 and #3
 cmp #2
 beq blocked
next:
 inx
 inx
 inx
 inx
 bne scan
blocked:
 rts
available:
 ldx #2
save_loop:
 lda $0114,x
 sta $73B8,x
 dex
 bpl save_loop
 lda #$a9
 sta $73B6
 lda #$51
 sta $73B7
 lda #1
 sta $15
 lda #2
 sta $17
 jmp $831d
