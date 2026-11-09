import {
  Controller,
  UseGuards,
  Post,
  Body,
  Patch,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  ParseIntPipe,
} from '@nestjs/common';
import { AuthGuard } from 'apps/auth-service/src/auth/auth.guard';
import { CurrentUser } from 'apps/auth-service/src/decorator/current-user.decorator';
import { AddTransportsDto } from '../dto/add-transports.dto';
import { UpdateTransportsDto } from '../dto/update-transports.dto';
import { TransportsService } from '../services/transports.service';

@UseGuards(AuthGuard)
@Controller('trips/:tripId/transports')
export class TransportsController {
  constructor(private readonly transportsService: TransportsService) {}

  @Post()
  create(
    @Param('tripId', ParseIntPipe) tripId: number,
    @Body() dto: AddTransportsDto,
    @CurrentUser() user: { id: number },
  ) {
    return this.transportsService.addTransport(tripId, user.id, dto);
  }

  @Get()
  findAll(
    @Param('tripId', ParseIntPipe) tripId: number,
    @CurrentUser() user: { id: number },
  ) {
    return this.transportsService.getAllTransports(tripId, user.id);
  }

  @Get(':id')
  findOne(
    @Param('tripId', ParseIntPipe) tripId: number,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: number },
  ) {
    return this.transportsService.getTransportById(id, user.id, tripId);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTransportsDto,
    @Param('tripId', ParseIntPipe) tripId: number,
    @CurrentUser() user: { id: number },
  ) {
    return this.transportsService.updateTransport(id, user.id, dto, tripId);
  }

  @Delete(':id')
  remove(
    @Param('tripId', ParseIntPipe) tripId: number,
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: { id: number },
  ) {
    return this.transportsService.deleteTransport(id, user.id, tripId);
  }
}
